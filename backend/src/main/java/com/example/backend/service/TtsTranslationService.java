package com.example.backend.service;

import com.google.cloud.texttospeech.v1.*;
import com.google.cloud.translate.Translate;
import com.google.cloud.translate.TranslateOptions;
import com.google.cloud.translate.Translation;
import org.springframework.stereotype.Service;

import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Service
public class TtsTranslationService {

    public String translateText(String text, String targetLang) {
        try {
            Translate translate = TranslateOptions.getDefaultInstance().getService();
            Translation translation = translate.translate(
                    text,
                    Translate.TranslateOption.targetLanguage(targetLang)
            );
            return translation.getTranslatedText();
        } catch (Exception e) {
            System.err.println("Translation failed, using original text for lang: " + targetLang + " - " + e.getMessage());
            // Translation API failed: return the original (untranslated) text rather than an
            // unrelated canned sentence, so the guide stays factually accurate even if not localized.
            return text;
        }
    }

    public String synthesizeSpeech(String text, String langCode) {
        try {
            try (TextToSpeechClient textToSpeechClient = TextToSpeechClient.create()) {
                SynthesisInput input = SynthesisInput.newBuilder().setText(text).build();
                
                // Map short language codes to full BCP-47 language codes required by Google TTS API
                String resolvedLangCode = langCode;
                if ("en".equalsIgnoreCase(langCode)) resolvedLangCode = "en-US";
                else if ("ja".equalsIgnoreCase(langCode)) resolvedLangCode = "ja-JP";
                else if ("zh".equalsIgnoreCase(langCode)) resolvedLangCode = "cmn-CN";
                else if ("ko".equalsIgnoreCase(langCode)) resolvedLangCode = "ko-KR";

                // Select voice based on language
                String voiceName = getVoiceName(resolvedLangCode);
                VoiceSelectionParams voice = VoiceSelectionParams.newBuilder()
                        .setLanguageCode(resolvedLangCode)
                        .setName(voiceName)
                        .build();

                AudioConfig audioConfig = AudioConfig.newBuilder()
                        .setAudioEncoding(AudioEncoding.MP3)
                        .build();

                SynthesizeSpeechResponse response = textToSpeechClient.synthesizeSpeech(input, voice, audioConfig);
                byte[] audioContent = response.getAudioContent().toByteArray();
                return Base64.getEncoder().encodeToString(audioContent);
            }
        } catch (Exception e) {
            System.err.println("TTS synthesis failed: " + e.getMessage());
            // Return empty instead of a silent-audio blob: a silent MP3 would satisfy the frontend's
            // "do we have audio" check yet play nothing, leaving the user with no feedback at all.
            // An empty string correctly falls through to the browser's native speech synthesis fallback.
            return "";
        }
    }

    private String getVoiceName(String resolvedLangCode) {
        switch (resolvedLangCode.toLowerCase()) {
            case "en-us":
                return "en-US-Neural2-F";
            case "ja-jp":
                return "ja-JP-Neural2-C";
            case "cmn-cn":
                return "cmn-CN-Wavenet-A";
            case "ko-kr":
            default:
                return "ko-KR-Neural2-B";
        }
    }
}
