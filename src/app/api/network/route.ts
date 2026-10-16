import { NextResponse } from 'next/server';
import { getPublicArkivClient, RPC_URL, CHAIN_ID } from '@/lib/arkivClient';
import { formatEther } from 'viem';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const client = getPublicArkivClient();
    const operatorAddress = process.env.NEXT_PUBLIC_OPERATOR_ADDRESS || '0x312d820b86Ab738f62cbEF5bcBb1DAC72660E617';
    
    let blockNumber = 0;
    let balance = '0';
    try {
      const block = await client.getBlockNumber();
      blockNumber = Number(block);
      const bal = await client.getBalance({ address: operatorAddress as `0x${string}` });
      balance = formatEther(bal);
    } catch (e) {
      console.warn('Network query warning:', e);
    }

    return NextResponse.json({
      success: true,
      chainId: CHAIN_ID,
      rpcUrl: RPC_URL,
      blockNumber,
      operatorAddress,
      balance,
      network: 'Tiramisu Testnet',
      faucetUrl: 'https://hub.arkiv.network',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
