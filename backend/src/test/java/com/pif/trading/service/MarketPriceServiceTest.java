package com.pif.trading.service;

import com.pif.trading.dto.CandleDto;
import com.pif.trading.exception.PriceUnavailableException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MarketPriceServiceTest {

    @Mock
    private MarketDataService marketDataService;

    @Mock
    private LocalCsvMarketDataService localCsvService;

    @InjectMocks
    private MarketPriceService marketPriceService;

    @BeforeEach
    void setUp() {
        when(localCsvService.hasSymbol("BIAT")).thenReturn(true);
        when(localCsvService.getCandles("BIAT", "1d", "ALL", 0)).thenReturn(List.of(
                new CandleDto("2022-01-03", 90, 91, 89, 90.5, 100),
                new CandleDto("2022-01-04", 91, 92, 90, 91.25, 100),
                new CandleDto("2022-01-07", 92, 93, 91, 92.75, 100)
        ));
    }

    @Test
    @DisplayName("Renvoie la clôture du jour exact")
    void exactDate() {
        assertThat(marketPriceService.getClosePrice("biat", "2022-01-04")).isEqualByComparingTo("91.250");
    }

    @Test
    @DisplayName("Jour non coté (week-end) : renvoie la dernière clôture connue avant la date")
    void dateBetweenCandles() {
        assertThat(marketPriceService.getClosePrice("BIAT", "2022-01-06")).isEqualByComparingTo("91.250");
    }

    @Test
    @DisplayName("Aucune bougie avant la date : prix indisponible")
    void dateBeforeHistory() {
        assertThatThrownBy(() -> marketPriceService.getClosePrice("BIAT", "2021-12-31"))
                .isInstanceOf(PriceUnavailableException.class);
    }

    @Test
    @DisplayName("Date vide : dernier cours connu")
    void blankDate() {
        assertThat(marketPriceService.findClosePrice("BIAT", "")).hasValueSatisfying(p ->
                assertThat(p).isEqualByComparingTo("92.750"));
    }
}
