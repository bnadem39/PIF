package com.pif.learning.catalog;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pif.learning.catalog.LearningCatalog.Catalog;
import com.pif.learning.catalog.LearningCatalog.Challenge;
import com.pif.learning.catalog.LearningCatalog.Criterion;
import com.pif.learning.catalog.LearningCatalog.Lesson;
import com.pif.learning.catalog.LearningCatalog.Module;
import com.pif.learning.catalog.LearningCatalog.Question;
import com.pif.learning.catalog.LearningCatalog.Quiz;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LearningCatalogTest {

    private static Module module(String id, String lessonId, String quizId, int answer) {
        return new Module(id, "Titre", "Débutant", "Description", List.of(new Lesson(lessonId, "Leçon", 5, List.of())),
                new Quiz(quizId, "Quiz", 0.6, List.of(new Question("q1", "Question ?", List.of("a", "b"), answer, "Parce que."))));
    }

    @Test
    void bundledCatalogIsValidAndComplete() throws Exception {
        LearningCatalog catalog = new LearningCatalog(new ObjectMapper());
        assertThat(catalog.catalog().modules()).hasSizeGreaterThanOrEqualTo(7);
        assertThat(catalog.catalog().modules()).allSatisfy(m -> {
            assertThat(m.lessons()).isNotEmpty();
            assertThat(m.quiz().questions()).hasSizeGreaterThanOrEqualTo(5);
        });
        assertThat(catalog.catalog().scenarios()).isNotEmpty();
        assertThat(catalog.catalog().challenges()).isNotEmpty();
        assertThat(catalog.lesson(catalog.catalog().modules().get(0).lessons().get(0).id())).isPresent();
        assertThat(catalog.quiz("inconnu")).isEmpty();
    }

    @Test
    void duplicateIdsAreRejected() {
        Catalog c = new Catalog(1, List.of(module("m1", "l1", "q1", 0), module("m2", "l1", "q2", 0)), List.of(), List.of());
        assertThatThrownBy(() -> new LearningCatalog(c)).hasMessageContaining("double : l1");
    }

    @Test
    void answerMustBeOneOfTheOptions() {
        Catalog c = new Catalog(1, List.of(module("m1", "l1", "q1", 2)), List.of(), List.of());
        assertThatThrownBy(() -> new LearningCatalog(c)).hasMessageContaining("hors des options");
    }

    @Test
    void unknownChallengeCriterionIsRejected() {
        Challenge ch = new Challenge("c1", "Défi", "BIAT", "2020-01-01", "2021-01-01", "", new Criterion("MAX_PROFIT", 1.0, null), 10, "");
        Catalog c = new Catalog(1, List.of(module("m1", "l1", "q1", 0)), List.of(), List.of(ch));
        assertThatThrownBy(() -> new LearningCatalog(c)).hasMessageContaining("critère inconnu");
    }
}
