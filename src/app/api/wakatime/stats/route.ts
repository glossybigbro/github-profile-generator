import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { apiKey } = body

        if (!apiKey) {
            return NextResponse.json({ success: false, message: 'API Key is required' }, { status: 400 })
        }

        const encodedKey = Buffer.from(apiKey).toString('base64')

        // 무료 유저는 구형/신규 정책에 따라 all_time 이나 last_year 데이터가 막혀있되 
        // 403 에러가 아니라 200 OK와 함께 빈 배열([])을 줄 수도 있습니다.
        // 따라서 빈 배열이 아닐 때까지 all_time -> last_year -> last_7_days 순서로 강력하게 폴백(Fallback) 조회를 수행합니다.
        const ranges = ['all_time', 'last_year', 'last_7_days']
        let finalData: any = null
        let finalRange = 'unknown'
        let isCalculating = false

        for (const range of ranges) {
            const response = await fetch(`https://wakatime.com/api/v1/users/current/stats/${range}`, {
                headers: {
                    'Authorization': `Basic ${encodedKey}`
                },
                cache: 'no-store'
            })

            if (response.status === 202) {
                isCalculating = true
                finalRange = range
                break // 202면 현재 이 범위를 처음 계산 중이라는 뜻이므로 즉시 중단하고 클라이언트에 알림
            }

            if (response.ok) {
                const data = await response.json()
                const langs = data.data?.languages || []

                // Add debug logging
                try {
                    const fs = require('fs')
                    fs.writeFileSync('/tmp/wakatime-debug.json', JSON.stringify({ range, length: langs.length, data }, null, 2))
                } catch (e) { }

                // 데이터가 비어있지 않은 "유효한 범위"를 찾았다면 채택 후 루프 종료
                if (langs.length > 0) {
                    finalData = data
                    finalRange = range
                    break
                }
            }
        }

        if (isCalculating) {
            return NextResponse.json({
                success: true,
                isCalculating: true,
                timeRange: finalRange,
                languages: []
            })
        }

        let languages = finalData?.data?.languages || []
        // finalData가 아예 없더라도 isIncludingToday를 false로 두고 summaries를 강제로 타도록 설정
        const isIncludingToday = finalData?.data?.is_including_today ?? false

        // 💡 [HYBRID FETCHING]
        // WakaTime 무료 계정의 `last_7_days` stats 요청은 오늘(Today) 데이터를 제외하는 경우가 있습니다.
        // 오늘 데이터가 반영되지 않은 경우, `/summaries` API를 사용해 '오늘 하루'의 데이터를 긁어와 병합합니다.
        if (!isIncludingToday) {
            try {
                // YYYY-MM-DD 형식의 오늘 날짜 구하기 (WakaTime API 요구 규격)
                const todayStr = new Date().toISOString().split('T')[0]

                const summariesResponse = await fetch(`https://wakatime.com/api/v1/users/current/summaries?start=${todayStr}&end=${todayStr}`, {
                    headers: { 'Authorization': `Basic ${encodedKey}` },
                    cache: 'no-store'
                })

                if (summariesResponse.ok) {
                    const todayData = await summariesResponse.json()
                    // summaries API는 data 배열 안에 날짜별 객체가 들어있음. 우리는 오늘 하루치만 요청했으므로 [0]번 인덱스 사용.
                    const todayLangs = todayData.data?.[0]?.languages || []

                    if (todayLangs.length > 0) {
                        try {
                            const fs = require('fs')
                            fs.writeFileSync('/tmp/wakatime-debug-summaries.json', JSON.stringify({ todayLangs }, null, 2))
                        } catch (e) { }

                        // 기본 데이터가 아예 없었을 경우를 방지하여 map 초기화 시 lang 데이터 꼼꼼히 적재
                        const mergedLangsMap = new Map()

                        for (const lang of languages) {
                            mergedLangsMap.set(lang.name, {
                                ...lang,
                                total_seconds: lang.total_seconds
                            })
                        }

                        for (const todayLang of todayLangs) {
                            if (mergedLangsMap.has(todayLang.name)) {
                                const existing = mergedLangsMap.get(todayLang.name)
                                existing.total_seconds += todayLang.total_seconds
                            } else {
                                mergedLangsMap.set(todayLang.name, {
                                    name: todayLang.name,
                                    total_seconds: todayLang.total_seconds
                                })
                            }
                        }

                        languages = Array.from(mergedLangsMap.values()).sort((a, b) => b.total_seconds - a.total_seconds)
                    }
                } else {
                    console.error("Summaries fetch failed with status:", summariesResponse.status)
                }
            } catch (mergeError) {
                console.error("Failed to merge today's summary:", mergeError)
            }
        }

        // 💡 [최종 데이터 확인 방어 로직] 
        // 하이브리드 병합까지 모두 마쳤는데도 결과가 비어있다면 에러로 간주
        if (languages.length === 0) {
            return NextResponse.json({
                success: true,
                isCalculating: false,
                timeRange: finalRange === 'unknown' ? 'today' : finalRange,
                languages: []
            })
        }

        return NextResponse.json({
            success: true,
            isCalculating: false,
            timeRange: finalRange === 'unknown' ? 'today' : finalRange,
            languages
        })
    } catch (e: unknown) {
        console.error('WakaTime Stats Error:', e)
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 })
    }
}
