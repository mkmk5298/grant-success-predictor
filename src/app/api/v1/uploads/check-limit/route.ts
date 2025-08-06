import { NextRequest, NextResponse } from 'next/server'
import { checkUploadLimit } from '@/middleware/uploadLimit'

export async function GET(req: NextRequest) {
  return await checkUploadLimit(req)
}

export async function POST(req: NextRequest) {
  return await checkUploadLimit(req)
}