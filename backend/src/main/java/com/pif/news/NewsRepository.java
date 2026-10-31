package com.pif.news;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NewsRepository extends JpaRepository<NewsArticle, Long> {

    List<NewsArticle> findByPublishedDateLessThanEqualOrderByPublishedDateDescIdDesc(String date, Pageable pageable);

    List<NewsArticle> findByPublishedDateBetweenOrderByPublishedDateDesc(String from, String to);

    List<NewsArticle> findAllByOrderByPublishedDateDescIdDesc();
}
