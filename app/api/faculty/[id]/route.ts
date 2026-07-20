import { createClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

const supabase = createClient()

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: facultyId } = await params

    // Get faculty details with user info
    const { data: faculty, error } = await supabase
      .from('faculty')
      .select(`
        id,
        user_id,
        assigned_standard,
        assigned_division,
        subject,
        faculty_name
      `)
      .eq('user_id', facultyId)
      .single()

    if (error || !faculty) {
      console.error('[v0] Error fetching faculty:', error)
      return NextResponse.json({ error: 'Faculty not found' }, { status: 404 })
    }

    console.log('[v0] Faculty fetched:', faculty)
    return NextResponse.json(faculty)
  } catch (error) {
    console.error('[v0] API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
