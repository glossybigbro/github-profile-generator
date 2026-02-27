import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { apiKey } = body

        if (!apiKey) {
            return NextResponse.json({ success: false, message: 'API Key is required' }, { status: 400 })
        }

        // Encode the API key for Basic Auth per WakaTime API docs
        const encodedKey = Buffer.from(apiKey).toString('base64')

        const response = await fetch('https://wakatime.com/api/v1/users/current', {
            headers: {
                'Authorization': `Basic ${encodedKey}`
            }
        })

        if (!response.ok) {
            return NextResponse.json({ success: false, message: 'Invalid API Key' }, { status: 401 })
        }

        const data = await response.json()

        return NextResponse.json({
            success: true,
            user: {
                id: data.data.id,
                username: data.data.username,
                displayName: data.data.display_name,
                photo: data.data.photo,
            }
        })
    } catch (e: unknown) {
        console.error('WakaTime Verify Error:', e)
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 })
    }
}
