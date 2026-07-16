import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { 
  MapPin, Volume2, VolumeX, Download, Eye, Mic, MicOff, RefreshCw, 
  CheckCircle, AlertTriangle, FileText, ChevronRight, Languages, Sparkles, Home, Sun, Moon
} from 'lucide-react';

// FadeIn wrapper component
function FadeIn({ children, delay = 0, duration = 1000 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className="transition-opacity"
      style={{
        opacity: visible ? 1 : 0,
        transitionDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  );
}

// AnimatedHeading component
function AnimatedHeading({ text, delay = 200, charDelay = 30 }) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimated(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const lines = text.split('\n');

  return (
    <h1 
      style={{
        fontSize: 'clamp(2.2rem, 5vw, 4.2rem)',
        fontWeight: 400,
        color: '#fff',
        lineHeight: 1.1,
        letterSpacing: '-0.04em',
        marginBottom: '1rem',
        wordBreak: 'keep-all',
        overflowWrap: 'normal',
      }}
    >
      {lines.map((line, lineIndex) => {
        const lineLength = line.length;
        return (
          <span key={lineIndex} className="block">
            {line.split('').map((char, charIndex) => {
              const staggerDelay = (lineIndex * lineLength * charDelay) + (charIndex * charDelay);
              
              return (
                <span
                  key={charIndex}
                  className="inline-block transition-all duration-500 ease-out"
                  style={{
                    opacity: animated ? 1 : 0,
                    transform: animated ? 'translateX(0)' : 'translateX(-18px)',
                    transitionDelay: `${staggerDelay}ms`,
                  }}
                >
                  {char === ' ' ? '\u00A0' : char}
                </span>
              );
            })}
          </span>
        );
      })}
    </h1>
  );
}

export default function App() {
  // Navigation State
  const [showDashboard, setShowDashboard] = useState(false);

  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [map, setMap] = useState(null);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [activePreset, setActivePreset] = useState('preset_starbucks');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState('ko');
  
  // STT & TTS
  const [isListening, setIsListening] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef(null);
  const recognitionRef = useRef(null);
  
  // Accessibility Filter
  const [visionFilter, setVisionFilter] = useState(''); // cataracts, protanopia, deuteranopia, grayscale, or empty
  
  // Canvas HUD Ref
  const canvasRef = useRef(null);

  // Responsive Dark Mode State & Listener
  const [isDarkMode, setIsDarkMode] = useState(true);
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);
    const listener = (e) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  // 3대 데모 프리셋 데이터 구조화
  const presetFiles = {
    preset_starbucks: {
      fileName: 'preset_starbucks',
      url: '/starbucks_entrance.png',
      name: '스타벅스 강남대로점'
    },
    preset_subway: {
      fileName: 'preset_subway',
      url: '/subway_entrance.png',
      name: '서브웨이 강남역점'
    },
    preset_kimbap: {
      fileName: 'preset_kimbap',
      url: '/kimbap_entrance.png',
      name: '김밥천국 강남점'
    }
  };

  // 1. 컴포넌트 마운트 시 Places 프리셋 조회
  useEffect(() => {
    fetch('/api/v1/accessibility/places')
      .then(res => res.json())
      .then(res => {
        setPlaces(res.data);
        if (res.data && res.data.length > 0) {
          setSelectedPlace(res.data[0]);
        }
      })
      .catch(err => console.error("Error loading places preset", err));
  }, []);

  // 2. Google Maps API 로드
  useEffect(() => {
    const loader = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "", // 구글맵 키 없어도 fallback 지도 렌더링
      version: "weekly",
      libraries: ["places"]
    });

    loader.load().then(() => {
      setGoogleMapsLoaded(true);
    }).catch(e => {
      console.warn("Google Maps failed to load. Displaying mock map panel.", e);
    });
  }, []);

  // 3. 구글맵 초기화 및 마커 렌더링
  const mapRef = useRef(null);
  useEffect(() => {
    if (googleMapsLoaded && mapRef.current && places.length > 0 && showDashboard) {
      const defaultCenter = { lat: 37.500854, lng: 127.036924 }; // 역삼 캠퍼스 중심
      const mapInstance = new google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 16,
        styles: [
          { elementType: "geometry", stylers: [{ color: "#161c2d" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#161c2d" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#7c8ba1" }] },
          { featureType: "road", elementType: "geometry", stylers: [{ color: "#222b40" }] },
          { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f131f" }] }
        ],
        disableDefaultUI: true
      });

      places.forEach(place => {
        const color = place.safetyScore >= 80 ? '#10b981' : place.safetyScore >= 50 ? '#f59e0b' : '#ef4444';
        
        const marker = new google.maps.Marker({
          position: { lat: place.latitude, lng: place.longitude },
          map: mapInstance,
          title: place.name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: color,
            fillOpacity: 0.9,
            strokeWeight: 2,
            strokeColor: '#ffffff',
            scale: 10
          }
        });

        marker.addListener('click', () => {
          setSelectedPlace(place);
          const matchedPreset = place.name.includes("스타벅스") || place.name.includes("이디야") ? "preset_starbucks" 
                             : place.name.includes("우체국") || place.name.includes("서브웨이") ? "preset_subway" : "preset_kimbap";
          setActivePreset(matchedPreset);
        });
      });

      // Autocomplete Search Box Integration
      const input = document.getElementById("pac-input");
      let currentCustomMarker = null;

      if (input) {
        // Clear previous searchbox nodes if any to prevent duplicates in controls
        mapInstance.controls[google.maps.ControlPosition.TOP_CENTER].clear();
        
        const searchBox = new google.maps.places.SearchBox(input);
        mapInstance.controls[google.maps.ControlPosition.TOP_CENTER].push(input);
        
        mapInstance.addListener("bounds_changed", () => {
          searchBox.setBounds(mapInstance.getBounds());
        });

        searchBox.addListener("places_changed", () => {
          const placesResult = searchBox.getPlaces();
          if (placesResult.length === 0) return;

          const pResult = placesResult[0];
          if (!pResult.geometry || !pResult.geometry.location) return;

          mapInstance.setCenter(pResult.geometry.location);
          mapInstance.setZoom(18);

          if (currentCustomMarker) {
            currentCustomMarker.setMap(null);
          }

          currentCustomMarker = new google.maps.Marker({
            map: mapInstance,
            title: pResult.name,
            position: pResult.geometry.location,
            icon: {
              path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              fillColor: '#3b82f6',
              fillOpacity: 0.9,
              strokeWeight: 2,
              strokeColor: '#ffffff',
              scale: 8
            }
          });

          const customPlace = {
            id: pResult.place_id || 'custom-search',
            name: pResult.name,
            address: pResult.formatted_address || '상세 주소 없음',
            latitude: pResult.geometry.location.lat(),
            longitude: pResult.geometry.location.lng(),
            isCustom: true
          };

          setSelectedPlace(customPlace);
          setActivePreset(null);
          triggerStreetViewAnalysis(customPlace);
        });
      }

      // Map Click Handler for Custom Pin placement
      mapInstance.addListener('click', (e) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();

        if (currentCustomMarker) {
          currentCustomMarker.setMap(null);
        }

        currentCustomMarker = new google.maps.Marker({
          map: mapInstance,
          title: "선택한 위치",
          position: e.latLng,
          icon: {
            path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            fillColor: '#3b82f6',
            fillOpacity: 0.9,
            strokeWeight: 2,
            strokeColor: '#ffffff',
            scale: 8
          }
        });

        const customPlace = {
          id: 'custom-click-' + Date.now(),
          name: '지도 위 선택한 지점',
          address: `위도: ${lat.toFixed(5)}, 경도: ${lng.toFixed(5)}`,
          latitude: lat,
          longitude: lng,
          isCustom: true
        };

        setSelectedPlace(customPlace);
        setActivePreset(null);
        triggerStreetViewAnalysis(customPlace);
      });

      setMap(mapInstance);
    }
  }, [googleMapsLoaded, places, showDashboard]);

  // 4. 프리셋이 바뀌거나 사용자가 마커를 클릭할 때 실시간 AI 분석 수행
  useEffect(() => {
    if (activePreset && showDashboard) {
      triggerAnalysis(presetFiles[activePreset].fileName);
    }
  }, [activePreset, language, showDashboard]);

  // 5. 선택된 장소 중심 이동
  useEffect(() => {
    if (map && selectedPlace && showDashboard) {
      map.panTo({ lat: selectedPlace.latitude, lng: selectedPlace.longitude });
      map.setZoom(17);
    }
  }, [selectedPlace, map, showDashboard]);

  // 6. 실시간 AI 분석 API 트리거
  const triggerAnalysis = async (fileName, fileObject = null) => {
    setLoading(true);
    stopAudio();

    const formData = new FormData();
    
    if (fileObject) {
      formData.append("file", fileObject);
    } else {
      try {
        const presetObj = presetFiles[activePreset];
        const response = await fetch(presetObj.url);
        const blob = await response.blob();
        const file = new File([blob], fileName, { type: blob.type });
        formData.append("file", file);
      } catch (e) {
        console.error("Failed to load preset file, sending dummy file", e);
        const dummyBlob = new Blob(["dummy"], { type: "image/png" });
        const file = new File([dummyBlob], fileName, { type: "image/png" });
        formData.append("file", file);
      }
    }

    formData.append("name", selectedPlace ? selectedPlace.name : presetFiles[activePreset].name);
    formData.append("address", selectedPlace ? selectedPlace.address : "서울특별시 강남구 테헤란로");
    formData.append("latitude", selectedPlace ? selectedPlace.latitude : 37.500854);
    formData.append("longitude", selectedPlace ? selectedPlace.longitude : 127.036924);

    try {
      const res = await fetch('/api/v1/accessibility/analyze', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setAnalysisResult(data.data);
      setLoading(false);
    } catch (err) {
      console.error("Analysis request failed", err);
      setLoading(false);
    }
  };

  // 6.2 거리뷰 자동 수집 분석 API 트리거
  const triggerStreetViewAnalysis = async (customPlace) => {
    setLoading(true);
    stopAudio();
    setAnalysisResult(null);

    const formData = new FormData();
    formData.append("name", customPlace.name);
    formData.append("address", customPlace.address);
    formData.append("latitude", customPlace.latitude);
    formData.append("longitude", customPlace.longitude);
    formData.append("apiKey", import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "");

    try {
      const res = await fetch('/api/v1/accessibility/streetview-analyze', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.data) {
        setAnalysisResult(data.data);
      } else {
        alert("이 위치의 거리뷰를 가져올 수 없거나 분석 중 오류가 발생했습니다.");
      }
      setLoading(false);
    } catch (err) {
      console.error("Street View Analysis failed", err);
      setLoading(false);
    }
  };

  // 7. 실시간 이미지 업로드 분석 핸들러
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      triggerAnalysis(file.name, file);
    }
  };

  // 8. HTML5 Canvas 3D HUD 투시 가이드라인 그리기
  useEffect(() => {
    if (analysisResult && canvasRef.current && showDashboard) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;
      const score = analysisResult.safetyScore;

      const color = score >= 80 ? 'rgba(16, 185, 129, 0.85)' : score >= 50 ? 'rgba(245, 158, 11, 0.85)' : 'rgba(239, 68, 68, 0.85)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 8;
      ctx.shadowColor = color;

      if (score >= 80) {
        ctx.beginPath();
        ctx.moveTo(w * 0.45, h * 0.55);
        ctx.lineTo(w * 0.55, h * 0.55);
        ctx.lineTo(w * 0.8, h * 0.95);
        ctx.lineTo(w * 0.2, h * 0.95);
        ctx.closePath();
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(w * 0.5, h * 0.9);
        ctx.lineTo(w * 0.5, h * 0.6);
        ctx.moveTo(w * 0.47, h * 0.67);
        ctx.lineTo(w * 0.5, h * 0.6);
        ctx.lineTo(w * 0.53, h * 0.67);
        ctx.stroke();

      } else if (score >= 50) {
        const stepH = 15;
        ctx.beginPath();
        ctx.rect(w * 0.3, h * 0.7, w * 0.4, stepH);
        ctx.rect(w * 0.33, h * 0.65, w * 0.34, stepH);
        ctx.stroke();
        ctx.fillStyle = 'rgba(245, 158, 11, 0.1)';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(w * 0.4, h * 0.75);
        ctx.lineTo(w * 0.45, h * 0.6);
        ctx.lineTo(w * 0.45, h * 0.75);
        ctx.closePath();
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.font = 'bold 11px Outfit';
        ctx.fillText(`14.5° Slope`, w * 0.47, h * 0.7);

      } else {
        ctx.lineWidth = 4;
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.moveTo(w * (0.2 + i * 0.03), h * (0.85 - i * 0.05));
          ctx.lineTo(w * (0.8 - i * 0.03), h * (0.85 - i * 0.05));
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.4, 25, 0, Math.PI * 2);
        ctx.moveTo(w * 0.45, h * 0.35);
        ctx.lineTo(w * 0.55, h * 0.45);
        ctx.moveTo(w * 0.55, h * 0.35);
        ctx.lineTo(w * 0.45, h * 0.45);
        ctx.stroke();
      }
    }
  }, [analysisResult, showDashboard]);

  // 9. GCP TTS 오디오 가이드 재생 컨트롤
  const playAudio = () => {
    if (!analysisResult || !analysisResult.audioGuide) return;

    const audioKey = `${language}Audio`;
    const textKey = `${language}Text`;
    const audioBase64 = analysisResult.audioGuide[audioKey];
    const speechText = analysisResult.audioGuide[textKey] || analysisResult.description;

    if (audioBase64 && audioBase64.length > 50) {
      if (isPlayingAudio && audioRef.current) {
        audioRef.current.pause();
        setIsPlayingAudio(false);
      } else {
        const audioSrc = `data:audio/mp3;base64,${audioBase64}`;
        const audio = new Audio(audioSrc);
        audio.onended = () => setIsPlayingAudio(false);
        audioRef.current = audio;
        audio.play();
        setIsPlayingAudio(true);
      }
    } else {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setIsPlayingAudio(false);
      } else {
        const utterance = new SpeechSynthesisUtterance(speechText);
        utterance.lang = language === 'ko' ? 'ko-KR' : language === 'ja' ? 'ja-JP' : language === 'zh' ? 'zh-CN' : 'en-US';
        utterance.onend = () => setIsPlayingAudio(false);
        window.speechSynthesis.speak(utterance);
        setIsPlayingAudio(true);
      }
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    window.speechSynthesis.cancel();
    setIsPlayingAudio(false);
  };

  // 10. 행정 건의서 다운로드 (.txt 파일 저장)
  const downloadPetition = () => {
    if (!analysisResult || !analysisResult.petitionText) return;
    const blob = new Blob([analysisResult.petitionText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `배리어프리_시설개선_건의서_${selectedPlace?.name || '건물'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 11. 원클릭 행정 건의서 가상 전송 팝업
  const [isSent, setIsSent] = useState(false);
  const sendPetitionSim = () => {
    setIsSent(true);
    setTimeout(() => setIsSent(false), 3000);
  };

  // 12. 음성 검색
  const startSTT = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("이 브라우저는 음성 인식을 지원하지 않습니다.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript.replace(/\s+/g, '');
      logSpeechSearch(text);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const logSpeechSearch = (speechQuery) => {
    const foundPlace = places.find(p => p.name.replace(/\s+/g, '').includes(speechQuery) || speechQuery.includes(p.name.replace(/\s+/g, '')));
    if (foundPlace) {
      setSelectedPlace(foundPlace);
      const matchedPreset = foundPlace.name.includes("이디야") || foundPlace.name.includes("스타벅스") ? "preset_starbucks" 
                         : foundPlace.name.includes("우체국") || foundPlace.name.includes("서브웨이") ? "preset_subway" : "preset_kimbap";
      setActivePreset(matchedPreset);
    } else {
      alert(`"${speechQuery}" 에 매칭되는 안심Preset을 찾을 수 없습니다. (이디야커피, 우체국, 도서관 가능)`);
    }
  };

  return (
    <div className={`w-full min-h-screen font-sans antialiased selection:bg-blue-600 selection:text-white overflow-x-hidden transition-colors duration-300 ${isDarkMode ? 'bg-[#0b0f19] text-white' : 'bg-gray-50 text-gray-900'}`}>
      
      {!showDashboard ? (
        // ------------------ ZeroStep Landing Page ------------------
        <div className="relative w-full min-h-screen flex flex-col overflow-hidden" style={{ background: '#000' }}>
          
          {/* Background Video - Raw, NO overlay */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ zIndex: 0, opacity: 0.45 }}
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260403_050628_c4e32401-fab4-4a27-b7a8-6e9291cd5959.mp4"
          />

          {/* Subtle gradient overlay for readability */}
          <div className="absolute inset-0" style={{ zIndex: 1, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.3) 100%)' }} />

          {/* Navigation Bar */}
          <header className="relative w-full px-6 md:px-10 lg:px-16 pt-5 pb-4" style={{ zIndex: 10 }}>
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center" style={{ gap: '10px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: 'linear-gradient(135deg, #3b82f6, #10b981)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.85rem', fontWeight: 700, color: '#fff',
                }}>Z</div>
                <span className="cursor-pointer select-none" style={{ fontSize: '1.4rem', fontWeight: 600, letterSpacing: '-0.03em', color: '#fff' }}>
                  ZeroStep
                </span>
              </div>
              
              {/* Center Nav Links */}
              <nav className="hidden md:flex items-center" style={{ gap: '2rem' }}>
                {['AI 분석', '3D HUD', '오디오 가이드', '건의서'].map(label => (
                  <span
                    key={label}
                    className="transition-opacity duration-200 hover:opacity-70 cursor-default"
                    style={{ fontSize: '0.85rem', fontWeight: 400, color: 'rgba(255,255,255,0.75)' }}
                  >
                    {label}
                  </span>
                ))}
              </nav>

              {/* CTA Button */}
              <button 
                onClick={() => setShowDashboard(true)}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #10b981)',
                  border: 'none',
                  color: '#fff',
                  padding: '9px 24px',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(59,130,246,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(59,130,246,0.3)'; }}
              >
                지도 시작하기
              </button>
            </div>
          </header>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Hero Content */}
          <main className="relative px-6 md:px-10 lg:px-16 pb-6" style={{ zIndex: 10 }}>
            
            {/* Badge */}
            <FadeIn delay={200} duration={800}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
                padding: '6px 14px', borderRadius: '20px', marginBottom: '1.2rem',
              }}>
                <Sparkles style={{ width: '14px', height: '14px', color: '#60a5fa' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 500, color: '#93c5fd', letterSpacing: '0.02em' }}>
                  Google Cloud + Vertex AI Gemini 2.5 Flash
                </span>
              </div>
            </FadeIn>

            {/* Heading */}
            <AnimatedHeading text={"모든 사람의 첫 걸음을\n동등하게."} />

            {/* Subheading */}
            <FadeIn delay={800} duration={1000}>
              <p style={{
                fontSize: '1.05rem', fontWeight: 300,
                color: 'rgba(255,255,255,0.65)', lineHeight: 1.7,
                marginBottom: '1.8rem', maxWidth: '520px',
              }}>
                건물 입구 사진 한 장으로 AI가 물리적 장벽을 분석하고,
                3D HUD 시각화 · 다국어 음성 안내 · 행정 건의서까지 자동으로 생성합니다.
              </p>
            </FadeIn>

            {/* CTA Buttons */}
            <FadeIn delay={1100} duration={1000}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
                <button 
                  onClick={() => setShowDashboard(true)}
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6, #10b981)',
                    color: '#fff', padding: '13px 32px', borderRadius: '12px',
                    fontSize: '0.95rem', fontWeight: 600, border: 'none',
                    cursor: 'pointer', transition: 'all 0.2s ease',
                    boxShadow: '0 4px 20px rgba(59,130,246,0.35)',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(59,130,246,0.45)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(59,130,246,0.35)'; }}
                >
                  <MapPin style={{ width: '16px', height: '16px' }} />
                  배리어프리 지도 시작
                </button>
                <button 
                  onClick={() => setShowDashboard(true)}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                    border: '1px solid rgba(255,255,255,0.2)', color: '#fff',
                    padding: '13px 28px', borderRadius: '12px',
                    fontSize: '0.95rem', fontWeight: 500, cursor: 'pointer',
                    transition: 'all 0.25s ease', boxShadow: 'none',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                >
                  프로젝트 소개
                </button>
              </div>
            </FadeIn>

            {/* Feature Cards Row */}
            <FadeIn delay={1400} duration={1000}>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px', maxWidth: '820px',
              }}>
                {[
                  { icon: <Sparkles style={{ width: '18px', height: '18px', color: '#60a5fa' }} />, title: 'Vertex AI 분석', desc: 'Gemini 2.5 Flash로 계단·경사로·문 자동 판독' },
                  { icon: <Eye style={{ width: '18px', height: '18px', color: '#34d399' }} />, title: '3D HUD 투시', desc: 'Canvas 기반 물리 장벽 3D 시각화 오버레이' },
                  { icon: <Volume2 style={{ width: '18px', height: '18px', color: '#fbbf24' }} />, title: '다국어 음성 안내', desc: 'Cloud TTS 한/영/일/중 자연어 오디오 가이드' },
                  { icon: <FileText style={{ width: '18px', height: '18px', color: '#f87171' }} />, title: '행정 건의서', desc: '교통약자법 제15조 기반 자동 건의서 생성' },
                ].map((feat, i) => (
                  <div key={i} style={{
                    background: 'rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '14px', padding: '16px 18px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                  >
                    <div style={{ marginBottom: '8px' }}>{feat.icon}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{feat.title}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 300, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{feat.desc}</div>
                  </div>
                ))}
              </div>
            </FadeIn>

            {/* Stats Bar */}
            <FadeIn delay={1700} duration={1000}>
              <div style={{
                display: 'flex', gap: '2rem', flexWrap: 'wrap',
                marginTop: '1.5rem', paddingTop: '1.2rem',
                borderTop: '1px solid rgba(255,255,255,0.08)',
              }}>
                {[
                  { value: '1,613만', label: '교통약자 인구' },
                  { value: '35.2%', label: '보행 장벽 경험' },
                  { value: '56.9%', label: '고령 장애인 비율' },
                ].map((stat, i) => (
                  <div key={i}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>{stat.value}</div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 400, color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </FadeIn>

          </main>

        </div>
      ) : (
        // ------------------ ZeroStep Dashboard ------------------
        <div className={`app-container ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
          
          {/* Map Area */}
          <section className="map-section" ref={mapRef}>
            {!googleMapsLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#111827] text-white z-20">
                <div className="text-center">
                  <RefreshCw className="animate-spin h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <p>구글 맵을 로딩하고 있습니다...</p>
                </div>
              </div>
            )}
            
            {googleMapsLoaded && (
              <input 
                id="pac-input" 
                type="text" 
                placeholder="🔍 분석할 장소를 검색하세요 (거리뷰 AI 자동 수집)" 
                className="pac-input-styled"
              />
            )}
            
            {/* Map Overlay Controls */}
            <div className="map-overlay-controls z-10">
              <div className="glass-panel control-panel flex items-center gap-3">
                <button 
                  onClick={() => setShowDashboard(false)}
                  className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors"
                  title="홈으로 돌아가기"
                >
                  <Home size={16} />
                </button>
                <div>
                  <h1 className="flex items-center gap-1 text-sm font-bold text-white">
                    <Sparkles className="text-blue-400 fill-blue-400" size={14} /> ZeroStep
                  </h1>
                  <p className="text-[10px] text-muted">무장애 안심 지도 & 3D HUD</p>
                </div>
              </div>

              {/* Voice Assist Search Panel */}
              <div className="glass-panel control-panel flex items-center gap-3">
                <button className={`audio-btn ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600'} text-white p-2 rounded-lg`} onClick={startSTT}>
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
                <div className="text-xs">
                  <p className="font-bold text-white">{isListening ? '말씀하세요...' : '음성 안내 도우미'}</p>
                  <p className="text-muted text-[10px]">"이디야커피", "우체국" 또는 "도서관" 검색</p>
                </div>
              </div>
            </div>
          </section>

          {/* Sidebar Section */}
          <section className="sidebar-section overflow-y-auto">
            
            {/* Title & Language Selector */}
            <div className="flex justify-between items-center">
              <h2 className="flex items-center gap-1.5 text-base font-semibold text-white">
                <FileText size={18} className="text-blue-400" /> 장소 상세 분석
              </h2>
              <div className="flex items-center gap-2">
                {/* Theme Toggle Button */}
                <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={`p-1.5 rounded-lg border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-amber-400' : 'bg-black/5 border-black/10 hover:bg-black/10 text-blue-500'}`}
                  title={isDarkMode ? "라이트 모드로 전환" : "다크 모드로 전환"}
                >
                  {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
                </button>

                <div className={`flex gap-1.5 items-center text-xs border rounded-lg p-1 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                  <Languages size={14} className="text-gray-400" />
                  <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value)}
                    className={`bg-transparent border-0 outline-none text-xs cursor-pointer ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                  >
                    <option value="ko" className={isDarkMode ? "bg-[#111827] text-white" : "bg-white text-gray-900"}>한국어</option>
                    <option value="en" className={isDarkMode ? "bg-[#111827] text-white" : "bg-white text-gray-900"}>English</option>
                    <option value="ja" className={isDarkMode ? "bg-[#111827] text-white" : "bg-white text-gray-900"}>日本語</option>
                    <option value="zh" className={isDarkMode ? "bg-[#111827] text-white" : "bg-white text-gray-900"}>中文</option>
                  </select>
                </div>
              </div>
            </div>



            {/* Custom Entrance Upload */}
            <div className="glass-panel p-4 flex flex-col gap-2">
              <p className="text-xs font-bold text-white">새 입구 사진 업로드 분석 (실시간 Vertex AI)</p>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload}
                className="text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-600/20 file:text-blue-400 file:cursor-pointer hover:file:bg-blue-600/30"
              />
            </div>

            {/* 3D HUD Render Card */}
            <div className="glass-panel p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-semibold text-white">{selectedPlace ? selectedPlace.name : '로딩 중...'}</h2>
                  <p className="text-xs text-muted mt-0.5">{selectedPlace ? selectedPlace.address : ''}</p>
                </div>
                
                {/* Safety Score Badge */}
                {analysisResult && (
                  <div className={`score-badge flex items-center gap-1 text-[11px] px-2 py-1 rounded-full font-bold ${
                    analysisResult.safetyScore >= 80 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : analysisResult.safetyScore >= 50 
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {analysisResult.safetyScore >= 80 ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                    안전: {analysisResult.safetyScore}점
                  </div>
                )}
              </div>

              {/* 3D HUD Canvas Image Container */}
              <div className={`hud-container relative w-full h-[220px] rounded-lg overflow-hidden border ${isDarkMode ? 'bg-black/40 border-white/5' : 'bg-gray-100 border-gray-200'} ${visionFilter ? `sim-${visionFilter}` : ''}`}>
                {analysisResult && analysisResult.imageUrl && (
                  <img 
                    src={analysisResult.imageUrl} 
                    alt="Entrance preview" 
                    className="w-full h-full object-cover"
                  />
                )}
                <canvas 
                  ref={canvasRef} 
                  width={640}
                  height={400}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />
                {loading && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center">
                    <div className="text-center text-xs text-blue-400 flex flex-col items-center gap-2">
                      <RefreshCw className="animate-spin h-6 w-6 text-blue-500" />
                      <p className="font-medium">GCP Vertex AI 입구 분석 중...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Audio Guide Card */}
            {analysisResult && (
              <div className="glass-panel p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <button 
                    className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md transition-colors"
                    onClick={playAudio}
                  >
                    {isPlayingAudio ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <div className="text-xs">
                    <p className="font-bold text-white">배리어프리 음성 가이드</p>
                    <p className="text-gray-400 mt-1 max-w-[340px] truncate-3-lines">
                      {analysisResult.audioGuide ? analysisResult.audioGuide[`${language}Text`] : analysisResult.description}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Administrative Petition Panel */}
            {analysisResult && analysisResult.safetyScore < 80 && (
              <div className="glass-panel p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <h2 className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    <AlertTriangle size={13} /> 법적 주출입구 단차 개선 건의서
                  </h2>
                  <button 
                    className="bg-white/10 hover:bg-white/20 text-white p-1 px-2.5 rounded text-xs flex items-center gap-1 transition-colors" 
                    onClick={downloadPetition}
                  >
                    <Download size={12} /> 다운로드
                  </button>
                </div>
                
                <div className="bg-black/40 border border-white/5 p-3 rounded-lg max-h-[140px] overflow-y-auto text-xs text-gray-400 font-mono whitespace-pre-line leading-relaxed">
                  {analysisResult.petitionText}
                </div>

                <button 
                  className="w-full text-xs py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md transition-colors" 
                  onClick={sendPetitionSim}
                >
                  {isSent ? '관할 구청 접수 및 팩스 발송 완료!' : '관할 구청 개선 민원 즉각 접수하기'}
                </button>
              </div>
            )}

            {/* Accessibility Simulator */}
            <div className="glass-panel p-4 flex flex-col gap-2">
              <h2 className="text-xs font-bold flex items-center gap-1.5 text-blue-400">
                <Eye size={14} /> 보행 약자 시각 장애 가상 시뮬레이터
              </h2>
              <p className="text-[11px] text-gray-400">안질환/색약 환자의 시야 장벽을 맵 위에 직접 투사해 체험합니다.</p>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button 
                  className={`py-1.5 px-2 rounded-lg border text-center transition-all ${
                    visionFilter === '' 
                      ? 'border-blue-500 bg-blue-500/20 text-blue-400 font-bold' 
                      : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                  onClick={() => setVisionFilter('')}
                >
                  정상 시야 (기본)
                </button>
                <button 
                  className={`py-1.5 px-2 rounded-lg border text-center transition-all ${
                    visionFilter === 'cataracts' 
                      ? 'border-blue-500 bg-blue-500/20 text-blue-400 font-bold' 
                      : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                  onClick={() => setVisionFilter('cataracts')}
                >
                  노안 / 백내장
                </button>
                <button 
                  className={`py-1.5 px-2 rounded-lg border text-center transition-all ${
                    visionFilter === 'protanopia' 
                      ? 'border-blue-500 bg-blue-500/20 text-blue-400 font-bold' 
                      : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                  onClick={() => setVisionFilter('protanopia')}
                >
                  적색맹 (Protanopia)
                </button>
                <button 
                  className={`py-1.5 px-2 rounded-lg border text-center transition-all ${
                    visionFilter === 'grayscale' 
                      ? 'border-blue-500 bg-blue-500/20 text-blue-400 font-bold' 
                      : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                  onClick={() => setVisionFilter('grayscale')}
                >
                  전색맹 (Grayscale)
                </button>
              </div>
            </div>

          </section>
        </div>
      )}

    </div>
  );
}
