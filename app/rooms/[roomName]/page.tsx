import * as React from 'react';
import { PageClientImpl } from './PageClientImpl';
import { isVideoCodec } from '@/lib/types';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ roomName: string }>;
  searchParams: Promise<{
    region?: string;
    hq?: string;
    codec?: string;
    singlePC?: string;
    name?: string;
  }>;
}) {
  const _params = await params;
  const _searchParams = await searchParams;

  // 1. ĐỔI MẶC ĐỊNH SANG H264 (Dòng 24 trong ảnh của bạn)
  const codec =
    typeof _searchParams.codec === 'string' && isVideoCodec(_searchParams.codec)
      ? _searchParams.codec
      : 'h264'; // <--- Đổi 'vp9' thành 'h264'

  const hq = _searchParams.hq === 'true' ? true : false;
  const singlePC = _searchParams.singlePC !== 'false';

  return (
    <PageClientImpl
      roomName={_params.roomName}
      region={_searchParams.region}
      hq={hq}
      codec={codec}
      singlePeerConnection={singlePC}
      // 2. TRUYỀN TÊN TỪ TRANG CHỦ XUỐNG ĐỂ KHÔNG BỊ HỎI LẠI
      initialName={typeof _searchParams.name === 'string' ? _searchParams.name : undefined}
    />
  );
}

