package com.pif.stresstest.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.pif.audit.model.AuditAction;
import com.pif.audit.service.AuditService;
import com.pif.auth.model.User;
import com.pif.stresstest.dto.RunRequest;
import com.pif.stresstest.dto.ScenarioDto;
import com.pif.stresstest.dto.ScenarioRequest;
import com.pif.stresstest.dto.ShocksDto;
import com.pif.stresstest.model.StressScenario;
import com.pif.stresstest.repository.StressScenarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Les scénarios sont stockés en base (gérés par l'admin) ; les calculs sont délégués au service IA.
 */
@Service
public class StressTestService {

    private final StressScenarioRepository repository;
    private final StressTestAiClient aiClient;
    private final AuditService auditService;

    public StressTestService(StressScenarioRepository repository, StressTestAiClient aiClient, AuditService auditService) {
        this.repository = repository;
        this.aiClient = aiClient;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<ScenarioDto> listScenarios() {
        return repository.findAllByOrderByPresetDescIdAsc().stream().map(ScenarioDto::from).toList();
    }

    public JsonNode banks() {
        return aiClient.get("/banks");
    }

    public JsonNode models() {
        return aiClient.get("/models");
    }

    public JsonNode run(User user, RunRequest request) {
        List<Map<String, Object>> scenarios = new ArrayList<>();
        if (request.scenarioIds() != null) {
            for (Long id : request.scenarioIds()) {
                StressScenario s = repository.findById(id)
                        .orElseThrow(() -> new IllegalArgumentException("Scénario introuvable : " + id));
                scenarios.add(scenarioPayload(s.getCode(), s.getName(), ScenarioDto.from(s).shocks()));
            }
        }
        if (request.customShocks() != null) {
            scenarios.add(scenarioPayload("CUSTOM", "Scénario personnalisé", request.customShocks()));
        }
        if (scenarios.isEmpty()) {
            throw new IllegalArgumentException("Choisissez au moins un scénario (scenarioIds) ou des chocs personnalisés (customShocks).");
        }

        Map<String, Object> body = new HashMap<>();
        body.put("scenarios", scenarios);
        body.put("explain", true);
        if (request.bankIds() != null && !request.bankIds().isEmpty()) {
            body.put("bank_ids", request.bankIds());
        }
        if (request.minCapitalRatio() != null) {
            body.put("min_capital_ratio", request.minCapitalRatio());
        }

        JsonNode result = aiClient.post("/run", body);
        auditService.record(user, AuditAction.STRESS_TEST_RUN, true,
                "Scénarios : " + scenarios.stream().map(s -> (String) s.get("code")).toList());
        return result;
    }

    @Transactional
    public ScenarioDto create(User admin, ScenarioRequest req) {
        if (repository.existsByCode(req.code())) {
            throw new IllegalArgumentException("Un scénario avec le code " + req.code() + " existe déjà.");
        }
        StressScenario s = new StressScenario();
        s.setPreset(false);
        apply(s, req);
        ScenarioDto saved = ScenarioDto.from(repository.save(s));
        auditService.record(admin, AuditAction.STRESS_SCENARIO_CHANGED, true, "Création " + req.code());
        return saved;
    }

    @Transactional
    public ScenarioDto update(User admin, Long id, ScenarioRequest req) {
        StressScenario s = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Scénario introuvable : " + id));
        if (!s.getCode().equals(req.code()) && repository.existsByCode(req.code())) {
            throw new IllegalArgumentException("Un scénario avec le code " + req.code() + " existe déjà.");
        }
        apply(s, req);
        ScenarioDto saved = ScenarioDto.from(repository.save(s));
        auditService.record(admin, AuditAction.STRESS_SCENARIO_CHANGED, true, "Modification " + req.code());
        return saved;
    }

    @Transactional
    public void delete(User admin, Long id) {
        StressScenario s = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Scénario introuvable : " + id));
        repository.delete(s);
        auditService.record(admin, AuditAction.STRESS_SCENARIO_CHANGED, true, "Suppression " + s.getCode());
    }

    private static void apply(StressScenario s, ScenarioRequest req) {
        s.setCode(req.code());
        s.setName(req.name());
        s.setDescription(req.description());
        ShocksDto k = req.shocks();
        s.setRateShockBp(k.rateShockBp());
        s.setEquityDropPct(k.equityDropPct());
        s.setUnemploymentIncreasePp(k.unemploymentIncreasePp());
        s.setGdpGrowthPct(k.gdpGrowthPct());
        s.setDefaultRateMultiplier(k.defaultRateMultiplier());
        s.setAssetQualityDowngrade(k.assetQualityDowngrade());
        s.setRevenueDropPct(k.revenueDropPct());
    }

    /**
     * Chocs au format attendu par le service IA (snake_case, ai/stress/api.py:ShocksIn).
     */
    static Map<String, Object> scenarioPayload(String code, String name, ShocksDto k) {
        Map<String, Object> shocks = new LinkedHashMap<>();
        shocks.put("rate_shock_bp", num(k.rateShockBp()));
        shocks.put("equity_drop_pct", num(k.equityDropPct()));
        shocks.put("unemployment_increase_pp", num(k.unemploymentIncreasePp()));
        shocks.put("gdp_growth_pct", num(k.gdpGrowthPct()));
        shocks.put("default_rate_multiplier", num(k.defaultRateMultiplier()));
        shocks.put("asset_quality_downgrade", num(k.assetQualityDowngrade()));
        shocks.put("revenue_drop_pct", num(k.revenueDropPct()));
        Map<String, Object> scenario = new LinkedHashMap<>();
        scenario.put("code", code);
        scenario.put("name", name);
        scenario.put("shocks", shocks);
        return scenario;
    }

    private static double num(BigDecimal v) {
        return v == null ? 0.0 : v.doubleValue();
    }
}
