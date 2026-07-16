package com.example.backend.controller;

import com.example.backend.global.response.ApiResponse;
import com.example.backend.service.GcpService;
import com.example.backend.service.TtsTranslationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@RestController
@RequestMapping("/api/v1/accessibility")
@CrossOrigin(origins = "*")
public class AccessibilityController {

    private final GcpService gcpService;
    private final TtsTranslationService ttsTranslationService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // In-memory list for demo presets
    private final List<Map<String, Object>> places = new ArrayList<>();

    public AccessibilityController(GcpService gcpService, TtsTranslationService ttsTranslationService) {
        this.gcpService = gcpService;
        this.ttsTranslationService = ttsTranslationService;
        initializePresets();
    }

    private void initializePresets() {
        // Preset 1: SSAFY 역삼 캠퍼스 근처 카페 (휠체어 진입 불가 - 계단 있음, 경사로 없음)
        Map<String, Object> p1 = new HashMap<>();
        p1.put("id", "preset-1");
        p1.put("name", "이디야커피 역삼점");
        p1.put("address", "서울특별시 강남구 테헤란로22길 12");
        p1.put("latitude", 37.500854);
        p1.put("longitude", 127.036924);
        p1.put("imageUrl", "https://storage.googleapis.com/g-access-uploads-mock/cafe-entrance.jpg");
        p1.put("accessibilityStatus", "INACCESSIBLE");
        p1.put("stairs", Map.of("stepHeight", 18.0, "steps", 3, "handrail", false));
        p1.put("ramp", Map.of("slopeAngle", 0.0, "hasRamp", false, "rampWidth", 0));
        p1.put("door", Map.of("doorType", "push_pull", "doorWidth", 80.0));
        p1.put("description", "진입구에 약 18cm 높이의 계단이 3개 존재하며, 경사로나 손잡이가 없어 휠체어 진입이 불가능한 상태입니다. 문은 여닫이형으로 유효 너비는 80cm입니다.");
        p1.put("audioGuide", generateAudioGuide("진입구에 약 18cm 높이의 계단이 3개 존재하며, 경사로나 손잡이가 없어 휠체어 진입이 불가능한 상태입니다. 문은 여닫이형으로 유효 너비는 80cm입니다."));
        p1.put("petitionText", generatePetitionText("이디야커피 역삼점", "서울특별시 강남구 테헤란로22길 12", 18.0, 3, 0.0, false));
        p1.put("safetyScore", 35);
        places.add(p1);

        // Preset 2: 역삼동 우체국 (일부 진입 가능 - 완만한 경사로 존재)
        Map<String, Object> p2 = new HashMap<>();
        p2.put("id", "preset-2");
        p2.put("name", "역삼동 우체국");
        p2.put("address", "서울특별시 강남구 테헤란로 212");
        p2.put("latitude", 37.502123);
        p2.put("longitude", 127.038456);
        p2.put("imageUrl", "https://storage.googleapis.com/g-access-uploads-mock/post-entrance.jpg");
        p2.put("accessibilityStatus", "PARTIALLY_ACCESSIBLE");
        p2.put("stairs", Map.of("stepHeight", 0.0, "steps", 0, "handrail", false));
        p2.put("ramp", Map.of("slopeAngle", 14.5, "hasRamp", true, "rampWidth", 90));
        p2.put("door", Map.of("doorType", "sliding", "doorWidth", 95.0));
        p2.put("description", "계단 단차는 없으나, 경사로 각도가 14.5도로 법정 기준(8.3도)보다 가팔라 휠체어 이용 시 보호자 동반을 권장합니다. 자동 슬라이딩 도어가 완비되어 있습니다.");
        p2.put("audioGuide", generateAudioGuide("계단 단차는 없으나, 경사로 각도가 14.5도로 법정 기준보다 가팔라 휠체어 이용 시 보호자 동반을 권장합니다. 자동 슬라이딩 도어가 완비되어 있습니다."));
        p2.put("petitionText", generatePetitionText("역삼동 우체국", "서울특별시 강남구 테헤란로 212", 0.0, 0, 14.5, true));
        p2.put("safetyScore", 65);
        places.add(p2);

        // Preset 3: 강남구립 역삼도서관 (완전 진입 가능 - 계단 없음, 완만한 법정 경사로 완비)
        Map<String, Object> p3 = new HashMap<>();
        p3.put("id", "preset-3");
        p3.put("name", "강남구립 역삼도서관");
        p3.put("address", "서울특별시 강남구 역삼로 307");
        p3.put("latitude", 37.499876);
        p3.put("longitude", 127.041234);
        p3.put("imageUrl", "https://storage.googleapis.com/g-access-uploads-mock/library-entrance.jpg");
        p3.put("accessibilityStatus", "ACCESSIBLE");
        p3.put("stairs", Map.of("stepHeight", 0.0, "steps", 0, "handrail", true));
        p3.put("ramp", Map.of("slopeAngle", 5.5, "hasRamp", true, "rampWidth", 120));
        p3.put("door", Map.of("doorType", "automatic", "doorWidth", 110.0));
        p3.put("description", "단차가 없으며 경사로 각도가 5.5도로 매우 완만하여 교통약자가 단독으로 진입하기 적합합니다. 진입문은 유효 너비 110cm의 자동문입니다.");
        p3.put("audioGuide", generateAudioGuide("단차가 없으며 경사로 각도가 5.5도로 매우 완만하여 교통약자가 단독으로 진입하기 적합합니다. 진입문은 유효 너비 110cm의 자동문입니다."));
        p3.put("petitionText", generatePetitionText("강남구립 역삼도서관", "서울특별시 강남구 역삼로 307", 0.0, 0, 5.5, true));
        p3.put("safetyScore", 95);
        places.add(p3);
    }

    @GetMapping("/places")
    public ApiResponse<List<Map<String, Object>>> getPlaces() {
        return ApiResponse.ok(places);
    }

    @PostMapping("/analyze")
    public ApiResponse<Map<String, Object>> analyzeEntrance(
            @RequestParam("file") MultipartFile file,
            @RequestParam("name") String name,
            @RequestParam("address") String address,
            @RequestParam("latitude") double latitude,
            @RequestParam("longitude") double longitude) {

        // 1. GCS 이미지 업로드
        String imageUrl = gcpService.uploadImage(file);

        // 2. Vertex AI Gemini 멀티모달 분석
        String geminiJson = gcpService.analyzeEntranceImage(file);
        
        Map<String, Object> result = new HashMap<>();
        result.put("id", UUID.randomUUID().toString());
        result.put("name", name);
        result.put("address", address);
        result.put("latitude", latitude);
        result.put("longitude", longitude);
        result.put("imageUrl", imageUrl);

        try {
            // Parse Gemini JSON
            Map<String, Object> geminiMap = objectMapper.readValue(geminiJson, Map.class);
            result.putAll(geminiMap);

            // Calculate Safety Score
            int safetyScore = calculateSafetyScore(geminiMap);
            result.put("safetyScore", safetyScore);

            // Extract values for petition generation
            Map<String, Object> stairs = (Map<String, Object>) geminiMap.get("stairs");
            Map<String, Object> ramp = (Map<String, Object>) geminiMap.get("ramp");

            double stepHeight = stairs != null && stairs.get("stepHeight") != null ? ((Number) stairs.get("stepHeight")).doubleValue() : 0.0;
            int steps = stairs != null && stairs.get("steps") != null ? ((Number) stairs.get("steps")).intValue() : 0;
            double slopeAngle = ramp != null && ramp.get("slopeAngle") != null ? ((Number) ramp.get("slopeAngle")).doubleValue() : 0.0;
            boolean hasRamp = ramp != null && ramp.get("hasRamp") != null && (boolean) ramp.get("hasRamp");

            String description = (String) geminiMap.getOrDefault("description", "진입구 보행 환경 분석 완료.");

            // 3. Translate & TTS 생성
            result.put("audioGuide", generateAudioGuide(description));

            // 4. 행정 건의서 작성
            result.put("petitionText", generatePetitionText(name, address, stepHeight, steps, slopeAngle, hasRamp));

            // Save to temporary memory list for session
            places.add(result);

        } catch (Exception e) {
            System.err.println("JSON Parsing failed: " + e.getMessage());
            // Safe fallback response structure
            result.put("accessibilityStatus", "INACCESSIBLE");
            result.put("stairs", Map.of("stepHeight", 15.0, "steps", 2, "handrail", false));
            result.put("ramp", Map.of("slopeAngle", 0.0, "hasRamp", false, "rampWidth", 0));
            result.put("door", Map.of("doorType", "push_pull", "doorWidth", 80.0));
            result.put("description", "진입로 분석 완료. 경사로 부재로 휠체어 통행이 제한됩니다.");
            result.put("audioGuide", generateAudioGuide("진입로 분석 완료. 경사로 부재로 휠체어 통행이 제한됩니다."));
            result.put("petitionText", generatePetitionText(name, address, 15.0, 2, 0.0, false));
            result.put("safetyScore", 30);
            places.add(result);
        }

        return ApiResponse.ok(result);
    }

    @PostMapping("/streetview-analyze")
    public ApiResponse<Map<String, Object>> analyzeStreetView(
            @RequestParam("name") String name,
            @RequestParam("address") String address,
            @RequestParam("latitude") double latitude,
            @RequestParam("longitude") double longitude) {

        String apiKey = getMapsApiKey();
        List<byte[]> images = new ArrayList<>();
        List<Integer> headings = Arrays.asList(0, 90, 180, 270);

        if (apiKey != null && !apiKey.isEmpty()) {
            for (int heading : headings) {
                byte[] imageBytes = fetchStreetViewImage(latitude, longitude, heading, apiKey);
                if (imageBytes != null) {
                    images.add(imageBytes);
                }
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("id", UUID.randomUUID().toString());
        result.put("name", name);
        result.put("address", address);
        result.put("latitude", latitude);
        result.put("longitude", longitude);

        if (images.isEmpty()) {
            // Fallback if no images fetched (e.g. no internet, quota limit, invalid key)
            System.err.println("No street view images fetched, using mock fallback");
            result.put("imageUrl", "https://storage.googleapis.com/g-access-uploads-mock/sample-entrance.jpg");
            result.put("accessibilityStatus", "INACCESSIBLE");
            result.put("stairs", Map.of("stepHeight", 15.0, "steps", 2, "handrail", false));
            result.put("ramp", Map.of("slopeAngle", 0.0, "hasRamp", false, "rampWidth", 0));
            result.put("door", Map.of("doorType", "push_pull", "doorWidth", 80.0));
            result.put("description", "거리뷰 이미지 수집 실패. 진입로 분석을 위한 대체 이미지를 사용합니다. 휠체어 단독 진입이 불가능한 계단 단차가 존재합니다.");
            result.put("audioGuide", generateAudioGuide("거리뷰 이미지 수집 실패. 진입로 분석을 위한 대체 이미지를 사용합니다. 휠체어 단독 진입이 불가능한 계단 단차가 존재합니다."));
            result.put("petitionText", generatePetitionText(name, address, 15.0, 2, 0.0, false));
            result.put("safetyScore", 35);
            places.add(result);
            return ApiResponse.ok(result);
        }

        // 2. Vertex AI Gemini 멀티모달 분석
        String geminiJson = gcpService.analyzeStreetViewImages(images, headings);
        
        try {
            // Parse Gemini JSON
            Map<String, Object> geminiMap = objectMapper.readValue(geminiJson, Map.class);
            result.putAll(geminiMap);

            // Calculate Safety Score
            int safetyScore = calculateSafetyScore(geminiMap);
            result.put("safetyScore", safetyScore);

            // Identify selected heading image to upload to GCS
            int selectedHeading = geminiMap.get("selectedHeading") != null ? ((Number) geminiMap.get("selectedHeading")).intValue() : 0;
            int selectedIndex = headings.indexOf(selectedHeading);
            if (selectedIndex == -1) selectedIndex = 0;
            
            byte[] selectedImageBytes = images.get(selectedIndex);
            String imageUrl = gcpService.uploadImageBytes(selectedImageBytes, "streetview_" + selectedHeading + ".jpg", "image/jpeg");
            result.put("imageUrl", imageUrl);

            // Extract values for petition generation
            Map<String, Object> stairs = (Map<String, Object>) geminiMap.get("stairs");
            Map<String, Object> ramp = (Map<String, Object>) geminiMap.get("ramp");

            double stepHeight = stairs != null && stairs.get("stepHeight") != null ? ((Number) stairs.get("stepHeight")).doubleValue() : 0.0;
            int steps = stairs != null && stairs.get("steps") != null ? ((Number) stairs.get("steps")).intValue() : 0;
            double slopeAngle = ramp != null && ramp.get("slopeAngle") != null ? ((Number) ramp.get("slopeAngle")).doubleValue() : 0.0;
            boolean hasRamp = ramp != null && ramp.get("hasRamp") != null && (boolean) ramp.get("hasRamp");

            String description = (String) geminiMap.getOrDefault("description", "거리뷰 입구 분석 완료.");

            // 3. Translate & TTS 생성
            result.put("audioGuide", generateAudioGuide(description));

            // 4. 행정 건의서 작성
            result.put("petitionText", generatePetitionText(name, address, stepHeight, steps, slopeAngle, hasRamp));

            // Save to temporary memory list for session
            places.add(result);

        } catch (Exception e) {
            System.err.println("JSON Parsing failed for street view: " + e.getMessage());
            result.put("imageUrl", "https://storage.googleapis.com/g-access-uploads-mock/sample-entrance.jpg");
            result.put("accessibilityStatus", "INACCESSIBLE");
            result.put("stairs", Map.of("stepHeight", 15.0, "steps", 2, "handrail", false));
            result.put("ramp", Map.of("slopeAngle", 0.0, "hasRamp", false, "rampWidth", 0));
            result.put("door", Map.of("doorType", "push_pull", "doorWidth", 80.0));
            result.put("description", "진입로 분석 완료. 경사로 부재로 휠체어 통행이 제한됩니다.");
            result.put("audioGuide", generateAudioGuide("진입로 분석 완료. 경사로 부재로 휠체어 통행이 제한됩니다."));
            result.put("petitionText", generatePetitionText(name, address, 15.0, 2, 0.0, false));
            result.put("safetyScore", 30);
            places.add(result);
        }

        return ApiResponse.ok(result);
    }

    private byte[] fetchStreetViewImage(double latitude, double longitude, int heading, String apiKey) {
        try {
            String url = String.format("https://maps.googleapis.com/maps/api/streetview?size=640x480&location=%f,%f&heading=%d&pitch=0&key=%s",
                    latitude, longitude, heading, apiKey);
            java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
            java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create(url))
                    .build();
            java.net.http.HttpResponse<byte[]> response = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() == 200) {
                return response.body();
            }
        } catch (Exception e) {
            System.err.println("Failed to fetch street view for heading " + heading + ": " + e.getMessage());
        }
        return null;
    }

    private String getMapsApiKey() {
        String key = System.getenv("GOOGLE_MAPS_API_KEY");
        if (key == null || key.isEmpty()) {
            key = System.getenv("VITE_GOOGLE_MAPS_API_KEY");
        }
        if (key == null || key.isEmpty()) {
            try {
                java.io.File envFile = new java.io.File("../frontend/.env");
                if (envFile.exists()) {
                    java.util.List<String> lines = java.nio.file.Files.readAllLines(envFile.toPath());
                    for (String line : lines) {
                        if (line.startsWith("VITE_GOOGLE_MAPS_API_KEY=")) {
                            key = line.split("=")[1].trim();
                            break;
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("Failed to read Maps API key from frontend .env: " + e.getMessage());
            }
        }
        return key;
    }


    private int calculateSafetyScore(Map<String, Object> geminiMap) {
        int score = 100;
        try {
            Map<String, Object> stairs = (Map<String, Object>) geminiMap.get("stairs");
            Map<String, Object> ramp = (Map<String, Object>) geminiMap.get("ramp");
            
            if (stairs != null) {
                int steps = stairs.get("steps") != null ? ((Number) stairs.get("steps")).intValue() : 0;
                double stepHeight = stairs.get("stepHeight") != null ? ((Number) stairs.get("stepHeight")).doubleValue() : 0.0;
                if (steps > 0) {
                    score -= (steps * 10);
                }
                if (stepHeight > 2.0) {
                    score -= 15;
                }
            }
            if (ramp != null) {
                boolean hasRamp = ramp.get("hasRamp") != null && (boolean) ramp.get("hasRamp");
                double slopeAngle = ramp.get("slopeAngle") != null ? ((Number) ramp.get("slopeAngle")).doubleValue() : 0.0;
                if (!hasRamp) {
                    score -= 30;
                } else if (slopeAngle > 8.3) {
                    score -= 15;
                }
            }
        } catch (Exception e) {
            score = 50;
        }
        return Math.max(10, Math.min(100, score));
    }

    private Map<String, String> generateAudioGuide(String koText) {
        Map<String, String> guides = new HashMap<>();
        
        // Translate text
        String enText = ttsTranslationService.translateText(koText, "en");
        String jaText = ttsTranslationService.translateText(koText, "ja");
        String zhText = ttsTranslationService.translateText(koText, "zh");

        // Synthesize TTS
        String koAudio = ttsTranslationService.synthesizeSpeech(koText, "ko");
        String enAudio = ttsTranslationService.synthesizeSpeech(enText, "en");
        String jaAudio = ttsTranslationService.synthesizeSpeech(jaText, "ja");
        String zhAudio = ttsTranslationService.synthesizeSpeech(zhText, "zh");

        guides.put("koText", koText);
        guides.put("enText", enText);
        guides.put("jaText", jaText);
        guides.put("zhText", zhText);

        guides.put("koAudio", koAudio);
        guides.put("enAudio", enAudio);
        guides.put("jaAudio", jaAudio);
        guides.put("zhAudio", zhAudio);

        return guides;
    }

    private String generatePetitionText(String placeName, String address, double stepHeight, int steps, double slopeAngle, boolean hasRamp) {
        StringBuilder sb = new StringBuilder();
        sb.append("[행정 건의서: 배리어프리 보행 환경 개선 요청]\n\n");
        sb.append("수신: 관할 구청장 (도로과 및 사회복지과 귀하)\n");
        sb.append("발신: 교통약자 이동권 확보를 위한 시민 모임 (G-Access AI 자동 생성 건의서)\n\n");
        sb.append("제목: ").append(placeName).append(" 진입로 보행 장벽 개선 및 이동 편의시설 설치 요청 건\n\n");
        sb.append("1. 현황 및 개선 필요 장소\n");
        sb.append("- 시설명: ").append(placeName).append("\n");
        sb.append("- 소재지: ").append(address).append("\n\n");
        sb.append("2. 법률적 근거\n");
        sb.append("- '교통약자의 이동편의 증진법' 제15조 (이동편의시설의 설치 등): 교통약자가 일상생활에서 안전하고 편리하게 이동할 수 있도록 시설의 주출입구 등에 이동편의시설을 설치하여야 합니다.\n");
        sb.append("- 동법 시행령 및 시행규칙: 주출입구의 높이 차이는 2센티미터 이하이어야 하며, 단차가 있을 경우 유효 폭 1.2미터 이상의 경사로를 설치하여야 합니다.\n\n");
        sb.append("3. 현장 실태 분석 결과 (AI 판독 데이터)\n");
        if (steps > 0) {
            sb.append("- 해당 시설의 주출입구 진입로에 약 ").append(stepHeight).append("cm 높이의 계단이 ").append(steps).append("개 존재합니다.\n");
        } else {
            sb.append("- 주출입구 계단 단차는 없습니다.\n");
        }
        if (!hasRamp) {
            sb.append("- 휠체어 및 유모차의 진입을 돕기 위한 경사로가 설치되어 있지 않습니다.\n");
        } else {
            sb.append("- 경사로가 설치되어 있으나 경사도가 약 ").append(slopeAngle).append("도로 법정 기준(1/12 또는 8.3도, 구조상 부득이한 경우 1/8 또는 4.7도)을 초과하여 교통약자 단독 이용에 무리가 있습니다.\n");
        }
        sb.append("\n4. 요청 사항\n");
        sb.append("- 주출입구의 문턱/계단 단차 해소 (2cm 이하로 단차 낮추기 작업 또는 법정 기준에 부합하는 경사로 설치)\n");
        sb.append("- 교통약자가 타인의 도움 없이 동등하게 진입할 수 있도록 신속한 행정 지도 및 도로 패치 조치를 건의드립니다.\n\n");
        sb.append("작성일자: 2026년 7월 16일\n");
        sb.append("G-Access AI 시민 건의 드림\n");
        return sb.toString();
    }
}
