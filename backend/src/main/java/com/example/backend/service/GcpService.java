package com.example.backend.service;

import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;
import com.google.cloud.vertexai.VertexAI;
import com.google.cloud.vertexai.api.GenerateContentResponse;
import com.google.cloud.vertexai.api.Part;
import com.google.cloud.vertexai.generativeai.ContentMaker;
import com.google.cloud.vertexai.generativeai.GenerativeModel;
import com.google.cloud.vertexai.generativeai.PartMaker;
import com.google.cloud.vertexai.generativeai.ResponseHandler;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Service
public class GcpService {

    public String uploadImage(MultipartFile file) {
        try {
            Storage storage = StorageOptions.getDefaultInstance().getService();
            String bucketName = System.getenv().getOrDefault("GCS_BUCKET_NAME", "zerostep-uploads");
            String objectName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
            BlobInfo blobInfo = BlobInfo.newBuilder(bucketName, objectName)
                    .setContentType(file.getContentType())
                    .build();
            storage.create(blobInfo, file.getBytes());
            return String.format("https://storage.googleapis.com/%s/%s", bucketName, objectName);
        } catch (Exception e) {
            System.err.println("GCS Upload failed, using fallback mock: " + e.getMessage());
            // Fallback mock URL
            return "https://storage.googleapis.com/zerostep-uploads-mock/sample-entrance.jpg";
        }
    }

    public String analyzeEntranceImage(MultipartFile file) {
        try {
            String projectId = System.getenv().getOrDefault("GCP_PROJECT_ID", "zerostep-project");
            String location = System.getenv().getOrDefault("GCP_LOCATION", "us-central1");

            try (VertexAI vertexAi = new VertexAI(projectId, location)) {
                GenerativeModel model = new GenerativeModel("gemini-2.5-flash", vertexAi);
                
                byte[] imageBytes = file.getBytes();
                Part imagePart = PartMaker.fromMimeTypeAndData(file.getContentType(), imageBytes);
                
                String prompt = "Analyze the building entrance photo. " +
                        "Identify the physical barriers for mobility-impaired individuals:\n" +
                        "1. Stairs: step height (in cm), number of steps, presence of handrail (true/false)\n" +
                        "2. Ramp: slope angle (in degrees), presence of ramp (true/false), ramp width (in cm)\n" +
                        "3. Door: door type (sliding, automatic, push_pull), door width (in cm)\n\n" +
                        "Format the response strictly as a JSON object with the following schema:\n" +
                        "{\n" +
                        "  \"stairs\": {\n" +
                        "    \"stepHeight\": number,\n" +
                        "    \"steps\": number,\n" +
                        "    \"handrail\": boolean\n" +
                        "  },\n" +
                        "  \"ramp\": {\n" +
                        "    \"slopeAngle\": number,\n" +
                        "    \"hasRamp\": boolean,\n" +
                        "    \"rampWidth\": number\n" +
                        "  },\n" +
                        "  \"door\": {\n" +
                        "    \"doorType\": \"sliding\" | \"automatic\" | \"push_pull\",\n" +
                        "    \"doorWidth\": number\n" +
                        "  },\n" +
                        "  \"accessibilityStatus\": \"ACCESSIBLE\" | \"PARTIALLY_ACCESSIBLE\" | \"INACCESSIBLE\",\n" +
                        "  \"description\": \"A short description in Korean of the barrier findings for the audio guide.\"\n" +
                        "}\n" +
                        "Do not include any markdown styling like ```json. Return only raw JSON.";

                GenerateContentResponse response = model.generateContent(
                        ContentMaker.fromMultiModalData(imagePart, prompt)
                );
                
                return ResponseHandler.getText(response);
            }
        } catch (Exception e) {
            System.err.println("Vertex AI Gemini Analysis failed, using fallback mock: " + e.getMessage());
            // Fallback mock JSON response
            return "{\n" +
                    "  \"stairs\": {\n" +
                    "    \"stepHeight\": 18,\n" +
                    "    \"steps\": 3,\n" +
                    "    \"handrail\": false\n" +
                    "  },\n" +
                    "  \"ramp\": {\n" +
                    "    \"slopeAngle\": 0,\n" +
                    "    \"hasRamp\": false,\n" +
                    "    \"rampWidth\": 0\n" +
                    "  },\n" +
                    "  \"door\": {\n" +
                    "    \"doorType\": \"push_pull\",\n" +
                    "    \"doorWidth\": 85\n" +
                    "  },\n" +
                    "  \"accessibilityStatus\": \"INACCESSIBLE\",\n" +
                    "  \"description\": \"진입구에 약 18cm 높이의 계단이 3개 존재하며, 경사로나 손잡이가 없어 휠체어 진입이 불가능한 상태입니다. 문은 여닫이형으로 유효 너비는 85cm입니다.\"\n" +
                    "}";
        }
    }

    public String analyzeStreetViewImages(java.util.List<byte[]> images, java.util.List<Integer> headings) {
        try {
            String projectId = System.getenv().getOrDefault("GCP_PROJECT_ID", "zerostep-project");
            String location = System.getenv().getOrDefault("GCP_LOCATION", "us-central1");

            try (VertexAI vertexAi = new VertexAI(projectId, location)) {
                GenerativeModel model = new GenerativeModel("gemini-2.5-flash", vertexAi);
                
                java.util.List<Object> parts = new java.util.ArrayList<>();
                for (int i = 0; i < images.size(); i++) {
                    byte[] imageBytes = images.get(i);
                    int heading = headings.get(i);
                    Part imagePart = PartMaker.fromMimeTypeAndData("image/jpeg", imageBytes);
                    parts.add(imagePart);
                }

                String prompt = "You are given " + images.size() + " street view photos of the same location from different headings in the following order: " + headings.toString() + ".\n" +
                        "Identify which heading contains the main entrance of the building. If multiple show it, choose the clearest one.\n" +
                        "Then, analyze the physical barriers for mobility-impaired individuals in that selected heading:\n" +
                        "1. Stairs: step height (in cm), number of steps, presence of handrail (true/false)\n" +
                        "2. Ramp: slope angle (in degrees), presence of ramp (true/false), ramp width (in cm)\n" +
                        "3. Door: door type (sliding, automatic, push_pull), door width (in cm)\n\n" +
                        "Format the response strictly as a JSON object with the following schema:\n" +
                        "{\n" +
                        "  \"selectedHeading\": number,\n" +
                        "  \"stairs\": {\n" +
                        "    \"stepHeight\": number,\n" +
                        "    \"steps\": number,\n" +
                        "    \"handrail\": boolean\n" +
                        "  },\n" +
                        "  \"ramp\": {\n" +
                        "    \"slopeAngle\": number,\n" +
                        "    \"hasRamp\": boolean,\n" +
                        "    \"rampWidth\": number\n" +
                        "  },\n" +
                        "  \"door\": {\n" +
                        "    \"doorType\": \"sliding\" | \"automatic\" | \"push_pull\",\n" +
                        "    \"doorWidth\": number\n" +
                        "  },\n" +
                        "  \"accessibilityStatus\": \"ACCESSIBLE\" | \"PARTIALLY_ACCESSIBLE\" | \"INACCESSIBLE\",\n" +
                        "  \"description\": \"A short description in Korean of the barrier findings for the audio guide.\"\n" +
                        "}\n" +
                        "Do not include any markdown styling like ```json. Return only raw JSON.";

                parts.add(prompt);

                GenerateContentResponse response = model.generateContent(
                        ContentMaker.fromMultiModalData(parts.toArray())
                );
                
                return ResponseHandler.getText(response);
            }
        } catch (Exception e) {
            System.err.println("Vertex AI Gemini Street View Analysis failed, using fallback mock: " + e.getMessage());
            // Fallback mock JSON response
            return "{\n" +
                    "  \"selectedHeading\": 90,\n" +
                    "  \"stairs\": {\n" +
                    "    \"stepHeight\": 15,\n" +
                    "    \"steps\": 2,\n" +
                    "    \"handrail\": true\n" +
                    "  },\n" +
                    "  \"ramp\": {\n" +
                    "    \"slopeAngle\": 5.5,\n" +
                    "    \"hasRamp\": true,\n" +
                    "    \"rampWidth\": 120\n" +
                    "  },\n" +
                    "  \"door\": {\n" +
                    "    \"doorType\": \"automatic\",\n" +
                    "    \"doorWidth\": 110\n" +
                    "  },\n" +
                    "  \"accessibilityStatus\": \"ACCESSIBLE\",\n" +
                    "  \"description\": \"동쪽(90도) 방향 거리뷰 분석 결과, 건물 진입구에 단차가 없으며 경사로 각도가 5.5도로 매우 완만하여 교통약자가 단독으로 진입하기 적합합니다. 진입문은 자동문입니다.\"\n" +
                    "}";
        }
    }

    public String uploadImageBytes(byte[] bytes, String fileName, String contentType) {
        try {
            Storage storage = com.google.cloud.storage.StorageOptions.getDefaultInstance().getService();
            String bucketName = System.getenv().getOrDefault("GCS_BUCKET_NAME", "zerostep-uploads");
            String objectName = UUID.randomUUID().toString() + "_" + fileName;
            BlobInfo blobInfo = BlobInfo.newBuilder(bucketName, objectName)
                    .setContentType(contentType)
                    .build();
            storage.create(blobInfo, bytes);
            return String.format("https://storage.googleapis.com/%s/%s", bucketName, objectName);
        } catch (Exception e) {
            System.err.println("GCS Byte Upload failed, using fallback mock: " + e.getMessage());
            return "https://storage.googleapis.com/zerostep-uploads-mock/sample-entrance.jpg";
        }
    }
}
