// 파일 경로: src/app/api/chat/route.ts
// SilverBridge - OpenAI GPT-4o API 연동
// 다정한 손주 페르소나로 어르신과 대화

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

// 손주 페르소나 시스템 프롬프트 (기본)
const BASE_SYSTEM_PROMPT = `너는 다정하고 싹싹한 손주야. 
할머니/할아버지가 이해하기 쉽게 짧고 친절하게 대답해.
반말과 존댓말을 자연스럽게 섞어서 말해.
어려운 단어는 쉬운 말로 바꿔서 설명해.
답변은 2-3문장으로 짧게 해.
항상 밝고 긍정적인 분위기로 대화해.`;

// 현재 시간 정보 생성 (한국 시간 기준)
function getCurrentTimeContext(): string {
    const now = new Date();

    // 한국 시간대로 변환
    const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    };

    const dateStr = now.toLocaleDateString('ko-KR', options);
    const year = now.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric' });
    const month = now.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric' });
    const day = now.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', day: 'numeric' });
    const weekday = now.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', weekday: 'long' });
    const time = now.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: true });

    return `[현재 시간 정보 - 반드시 이 정보를 사용해서 답변해]
- 현재 연도: ${year}
- 현재 날짜: ${month} ${day}
- 오늘 요일: ${weekday}
- 현재 시각: ${time}
- 전체: ${dateStr}

날짜, 시간, 요일에 대한 질문에는 위 정보를 정확하게 사용해서 답변해.`;
}

// 실시간 정보가 포함된 시스템 프롬프트 생성
function getSystemPromptWithContext(): string {
    return `${BASE_SYSTEM_PROMPT}

${getCurrentTimeContext()}`;
}

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

        // 요청에서 사용자 메시지 추출
        const { message } = await request.json();

        if (!message) {
            return NextResponse.json(
                { error: "메시지가 없어요" },
                { status: 400 }
            );
        }

        console.log("사용자 메시지:", message);

        // GPT-4o에게 질문
        const completion = await getOpenAIClient().chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: getSystemPromptWithContext() },
                { role: "user", content: message },
            ],
            max_tokens: 200,
            temperature: 0.8,
        });

        // AI 응답 추출
        const reply = completion.choices[0]?.message?.content || "잠깐, 다시 한번 말씀해 주실래요?";
        console.log("AI 응답:", reply);

        return NextResponse.json({ reply });
    } catch (error: unknown) {
        console.error("OpenAI API 오류 상세:", error);

        // 에러 타입에 따른 메시지
        const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";

        return NextResponse.json(
            { error: `AI 연결 오류: ${errorMessage}` },
            { status: 500 }
        );
    }
}
