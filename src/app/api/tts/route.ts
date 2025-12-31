// 파일 경로: src/app/api/tts/route.ts
// SilverBridge - OpenAI TTS API (자연스러운 음성 합성)
// 개선: API 키 검증, 텍스트 길이 제한, 상세 에러 처리, 캐싱

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// OpenAI 클라이언트 지연 초기화 (빌드 시점 에러 방지)
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
    if (!openai) {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    return openai;
}

// 텍스트 길이 제한 (OpenAI TTS 제한: 4096자)
const MAX_TEXT_LENGTH = 4000;

export async function POST(request: NextRequest) {
    try {
        // API 키 확인
        if (!process.env.OPENAI_API_KEY) {
            console.error("OPENAI_API_KEY가 설정되지 않았습니다!");
            return NextResponse.json(
                { error: "API 키가 설정되지 않았어요" },
                { status: 500 }
            );
        }

        // 요청 본문 파싱
        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "잘못된 요청 형식이에요" },
                { status: 400 }
            );
        }

        const { text, voice = "nova", speed = 0.95 } = body;

        // 텍스트 검증
        if (!text || typeof text !== "string") {
            return NextResponse.json(
                { error: "텍스트가 없어요" },
                { status: 400 }
            );
        }

        // 텍스트 정리 (앞뒤 공백 제거)
        const cleanText = text.trim();

        if (cleanText.length === 0) {
            return NextResponse.json(
                { error: "텍스트가 비어있어요" },
                { status: 400 }
            );
        }

        // 텍스트 길이 제한 확인
        if (cleanText.length > MAX_TEXT_LENGTH) {
            return NextResponse.json(
                { error: `텍스트가 너무 길어요 (최대 ${MAX_TEXT_LENGTH}자)` },
                { status: 400 }
            );
        }

        // 허용된 음성 목록
        const allowedVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
        const selectedVoice = allowedVoices.includes(voice) ? voice : "nova";

        // 속도 범위 제한 (0.25 ~ 4.0)
        const selectedSpeed = Math.max(0.25, Math.min(4.0, Number(speed) || 0.95));

        console.log(`TTS 요청: ${cleanText.substring(0, 50)}... (${cleanText.length}자, 음성: ${selectedVoice})`);

        // OpenAI TTS 호출
        const mp3 = await getOpenAIClient().audio.speech.create({
            model: "tts-1",
            voice: selectedVoice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
            input: cleanText,
            speed: selectedSpeed,
        });

        // 오디오 데이터를 ArrayBuffer로 변환
        const buffer = Buffer.from(await mp3.arrayBuffer());

        // MP3로 응답 (캐싱 헤더 포함)
        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "audio/mpeg",
                "Content-Length": buffer.length.toString(),
                "Cache-Control": "private, max-age=3600", // 1시간 캐싱
            },
        });
    } catch (error: unknown) {
        console.error("TTS 오류:", error);

        // OpenAI API 에러 처리
        if (error instanceof OpenAI.APIError) {
            if (error.status === 401) {
                return NextResponse.json(
                    { error: "API 인증에 실패했어요" },
                    { status: 500 }
                );
            }
            if (error.status === 429) {
                return NextResponse.json(
                    { error: "요청이 너무 많아요. 잠시 후 다시 시도해주세요" },
                    { status: 429 }
                );
            }
            if (error.status === 500 || error.status === 503) {
                return NextResponse.json(
                    { error: "OpenAI 서비스에 문제가 있어요" },
                    { status: 502 }
                );
            }
        }

        return NextResponse.json(
            { error: "음성 생성에 실패했어요" },
            { status: 500 }
        );
    }
}
