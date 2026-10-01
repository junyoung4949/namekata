package dev.namekata;

import dev.namekata.naming.LevelPolicy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 도메인 객체를 빈으로 올린다.
 *
 * <p>{@code naming} 패키지에는 Spring 애너테이션이 하나도 없다. 거기 들어 있는
 * 것들(이름 쪼개기, 단어 채점, 등급 정하기)은 웹이나 DB 와 아무 상관이 없고,
 * 테스트도 {@code new} 로 만들어 돌린다. 프레임워크를 아는 코드와 모르는 코드를
 * 가르는 자리가 여기다.
 */
@Configuration
public class DomainConfig {

    @Bean
    LevelPolicy levelPolicy() {
        return new LevelPolicy();
    }
}
