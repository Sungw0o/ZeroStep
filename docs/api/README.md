# API 계약

## 공통 규칙

- 기본 prefix: `/api/v1`
- Content-Type: `application/json`
- 요청 추적 헤더: `X-Trace-Id`를 전달하거나 서버가 생성한다.

성공 응답:

```json
{
  "data": {},
  "meta": null
}
```

실패 응답은 추후 공통 예외 처리 도입 시 다음 계약을 사용한다.

```json
{
  "error": {
    "code": "STABLE_ERROR_CODE",
    "message": "사용자에게 보여 줄 메시지",
    "fieldErrors": []
  },
  "traceId": "요청 추적 ID"
}
```

## 현재 엔드포인트

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/v1/hello` | 프론트·백엔드 연결 확인 |
| GET | `/api/v1/health` | 애플리케이션 간단 상태 확인 |
| GET | `/actuator/health` | 배포 Readiness 확인 |
| GET | `/actuator/prometheus` | Prometheus 메트릭 |

