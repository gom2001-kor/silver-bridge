// 파일 경로: src/app/page.tsx
// SilverBridge - 메인 화면 (음성 대화 기능)
// 모바일 최적화 + Web Speech API (STT/TTS) + OpenAI 연동
"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Loader2, Volume2 } from "lucide-react";

// ===== Web Speech API 타입 정의 =====
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionInstance;
}

// ===== 상태 타입 정의 =====
type Status = "idle" | "listening" | "thinking" | "speaking";

// ===== 상태별 색상 =====
const statusColors: Record<Status, string> = {
  idle: "bg-silver-orange hover:bg-silver-orange-hover", // 주황 - 대기
  listening: "bg-red-500", // 빨강 - 듣는 중
  thinking: "bg-yellow-500", // 노랑 - 생각 중
  speaking: "bg-green-500", // 초록 - 말하는 중
};

// ===== 상태별 텍스트 =====
const statusTexts: Record<Status, string> = {
  idle: "누르고 말씀하세요",
  listening: "듣고 있어요...",
  thinking: "생각 중이에요...",
  speaking: "말하고 있어요...",
};

// ===== 상태별 안내 텍스트 =====
const statusSubTexts: Record<Status, string> = {
  idle: "버튼을 꾹 누르세요",
  listening: "말씀이 끝나면 자동으로 넘어가요",
  thinking: "잠시만 기다려주세요",
  speaking: "끝까지 들어주세요",
};

export default function Home() {
  // ===== 상태 관리 =====
  const [status, setStatus] = useState<Status>("idle");
  const [transcript, setTranscript] = useState(""); // 인식된 텍스트
  const [response, setResponse] = useState(""); // AI 응답

  // ===== Refs =====
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // ===== Web Speech API 초기화 =====
  useEffect(() => {
    // 브라우저 호환성 처리 (Chrome: webkitSpeechRecognition)
    const windowWithSpeech = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };

    const SpeechRecognitionClass = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = "ko-KR"; // 한국어
      recognition.continuous = false; // 한 문장씩
      recognition.interimResults = false; // 최종 결과만

      // 음성 인식 결과 처리
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        handleSendMessage(text); // AI에게 전송
      };

      // 인식 종료 시
      recognition.onend = () => {
        if (status === "listening") {
          setStatus("thinking");
        }
      };

      // 에러 처리
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("음성 인식 오류:", event.error);
        setStatus("idle");
      };

      recognitionRef.current = recognition;
    }
  }, []);


  // ===== 마이크 버튼 클릭 핸들러 =====
  const handleMicClick = () => {
    if (status === "idle") {
      // 대기 -> 듣기 시작
      startListening();
    } else if (status === "listening") {
      // 듣기 중지
      stopListening();
    } else if (status === "speaking") {
      // 말하기 중지
      window.speechSynthesis.cancel();
      setStatus("idle");
    }
  };

  // ===== 음성 인식 시작 =====
  const startListening = () => {
    if (recognitionRef.current) {
      setTranscript("");
      setResponse("");
      setStatus("listening");
      recognitionRef.current.start();
    } else {
      alert("이 브라우저에서는 음성 인식이 지원되지 않아요.");
    }
  };

  // ===== 음성 인식 중지 =====
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  // ===== AI에게 메시지 전송 =====
  const handleSendMessage = async (message: string) => {
    setStatus("thinking");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();

      if (data.reply) {
        setResponse(data.reply);
        speak(data.reply); // TTS로 읽어주기
      } else {
        setResponse(data.error || "응답을 받지 못했어요.");
        setStatus("idle");
      }
    } catch (error) {
      console.error("API 오류:", error);
      setResponse("인터넷 연결을 확인해주세요.");
      setStatus("idle");
    }
  };

  // ===== TTS (OpenAI 자연스러운 음성) =====
  const speak = async (text: string, retryCount = 0) => {
    setStatus("speaking");

    const MAX_RETRIES = 2;
    const TIMEOUT_MS = 30000; // 30초 타임아웃

    try {
      // 타임아웃 을 위한 AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      // OpenAI TTS API 호출
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // 서버 에러 응답 파싱
        let errorMessage = "TTS 요청 실패";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // JSON 파싱 실패시 기본 메시지 사용
        }
        throw new Error(errorMessage);
      }

      // 오디오 데이터를 Blob으로 변환
      const audioBlob = await response.blob();

      // 유효한 오디오 데이터인지 확인
      if (audioBlob.size === 0) {
        throw new Error("빈 오디오 데이터");
      }

      const audioUrl = URL.createObjectURL(audioBlob);

      // 오디오 재생
      const audio = new Audio(audioUrl);

      // 재생 준비 완료 대기
      audio.oncanplaythrough = async () => {
        try {
          await audio.play();
        } catch (playError) {
          console.error("오디오 재생 시작 오류:", playError);
          URL.revokeObjectURL(audioUrl);
          fallbackSpeak(text);
        }
      };

      audio.onended = () => {
        setStatus("idle");
        URL.revokeObjectURL(audioUrl); // 메모리 정리
      };

      audio.onerror = () => {
        console.error("오디오 재생 오류");
        URL.revokeObjectURL(audioUrl);
        // 재시도 또는 폴백
        if (retryCount < MAX_RETRIES) {
          speak(text, retryCount + 1);
        } else {
          fallbackSpeak(text);
        }
      };

      // 로드 시작
      audio.load();
    } catch (error) {
      console.error("TTS 오류:", error);

      // 타임아웃 또는 네트워크 에러시 재시도
      if (retryCount < MAX_RETRIES && error instanceof Error) {
        if (error.name === "AbortError" || error.message.includes("network")) {
          console.log(`TTS 재시도 (${retryCount + 1}/${MAX_RETRIES})`);
          setTimeout(() => speak(text, retryCount + 1), 1000);
          return;
        }
      }

      // 실패 시 브라우저 TTS로 폴백
      fallbackSpeak(text);
    }
  };

  // ===== 브라우저 TTS (폴백용) =====
  const fallbackSpeak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    utterance.rate = 0.9;
    utterance.pitch = 1.1;

    utterance.onend = () => setStatus("idle");
    utterance.onerror = () => setStatus("idle");

    window.speechSynthesis.speak(utterance);
  };

  // ===== 아이콘 선택 =====
  const renderIcon = () => {
    switch (status) {
      case "listening":
        return <Mic className="text-white z-10 animate-pulse" size={100} strokeWidth={2} />;
      case "thinking":
        return <Loader2 className="text-white z-10 animate-spin" size={100} strokeWidth={2} />;
      case "speaking":
        return <Volume2 className="text-white z-10 animate-pulse" size={100} strokeWidth={2} />;
      default:
        return <Mic className="text-white z-10" size={100} strokeWidth={2} />;
    }
  };

  return (
    <main
      className="h-[100dvh] w-full bg-white flex flex-col items-center justify-center p-4 overflow-hidden"
      style={{ touchAction: "manipulation" }} // 더블탭 확대 방지
    >
      {/* ===== 초대형 마이크 버튼 ===== */}
      <button
        onClick={handleMicClick}
        className={`
          relative
          w-56 h-56
          sm:w-64 sm:h-64
          md:w-80 md:h-80
          rounded-full
          flex items-center justify-center
          transition-all duration-300 ease-in-out
          shadow-2xl
          focus:outline-none focus:ring-4 focus:ring-orange-300
          active:scale-95
          ${statusColors[status]}
          ${status !== "idle" ? "scale-105" : "hover:scale-105"}
        `}
        aria-label={statusTexts[status]}
      >
        {/* 파동 애니메이션 (대기 상태 제외) */}
        {status !== "idle" && (
          <>
            <span className={`absolute w-full h-full rounded-full ${statusColors[status]} animate-ping opacity-30`} />
            <span className={`absolute w-full h-full rounded-full ${statusColors[status]} animate-pulse opacity-20`} />
          </>
        )}

        {/* 아이콘 */}
        {renderIcon()}
      </button>

      {/* ===== 상태 텍스트 ===== */}
      <p
        className={`
          mt-8 sm:mt-10 md:mt-12 
          text-3xl sm:text-4xl md:text-5xl 
          font-bold 
          text-center
          transition-colors duration-300
          ${status === "idle" ? "text-silver-black" :
            status === "listening" ? "text-red-500" :
              status === "thinking" ? "text-yellow-600" : "text-green-600"}
        `}
      >
        {statusTexts[status]}
      </p>

      {/* ===== 보조 텍스트 ===== */}
      <p className="mt-3 sm:mt-4 text-lg sm:text-xl text-silver-gray-light text-center">
        {statusSubTexts[status]}
      </p>

      {/* ===== 대화 내용 표시 (있을 때만) ===== */}
      {(transcript || response) && (
        <div className="mt-8 w-full max-w-md px-4">
          {transcript && (
            <div className="bg-silver-bg-light rounded-silver p-4 mb-3">
              <p className="text-sm text-silver-gray-light mb-1">내가 한 말:</p>
              <p className="text-lg text-silver-black">{transcript}</p>
            </div>
          )}
          {response && (
            <div className="bg-silver-orange-light rounded-silver p-4">
              <p className="text-sm text-silver-gray-light mb-1">AI 손주:</p>
              <p className="text-lg text-silver-black">{response}</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
