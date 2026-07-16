# 배포 Runbook

## 원칙

이 프로젝트는 Continuous Delivery를 사용한다. CI 검증과 결과물 준비는 자동화하지만 운영 반영은 담당자가 승인하고 실행한다.

## 배포 전

1. Jenkins frontend lint/test/build와 backend test/bootJar가 통과했는지 확인한다.
2. SonarQube Quality Gate와 JaCoCo 리포트를 확인한다.
3. DB migration, 환경변수, Secret 변경 여부를 확인한다.
4. 배포할 Git SHA와 Docker image tag를 기록한다.

## 프론트엔드

1. `frontend/dist` 산출물을 S3에 업로드한다.
2. CloudFront 반영과 주요 화면을 확인한다.
3. API 오류와 브라우저 콘솔 오류를 확인한다.

## 백엔드

1. 승인된 image tag를 EC2 Docker Compose 설정에 반영한다.
2. 컨테이너를 갱신한다.
3. `/actuator/health`와 `/api/v1/health`를 확인한다.
4. 5xx, latency, CPU·memory, 로그의 traceId를 확인한다.

## Rollback

- Readiness 실패, 지속적인 5xx 증가, 주요 사용자 흐름 실패 시 이전 정상 image tag와 프론트 산출물로 복구한다.
- 운영 명령은 자동화 에이전트가 승인 없이 실행하지 않는다.
- 배포 시간, 결과, 원인, 복구 버전을 기록한다.

