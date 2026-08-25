import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/auth'
import { getDeploymentStatus } from '@/lib/vercel-deployments'

export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 })
  }

  const sha = request.nextUrl.searchParams.get('sha')
  if (!sha || !/^[0-9a-f]{7,40}$/i.test(sha)) {
    return NextResponse.json({ error: 'Invalid commit SHA' }, { status: 400 })
  }

  return NextResponse.json(await getDeploymentStatus(sha), {
    headers: { 'Cache-Control': 'no-store' },
  })
}
