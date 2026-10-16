import { NextResponse } from 'next/server';
import {
  fetchLiveOrgans,
  getWalletArkivClient,
  getPublicArkivClient,
  OrganItem,
} from '@/lib/arkivClient';
import { str, i32, jsonToPayload, ExpirationTime } from '@arkiv-network/sdk';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const organs = await fetchLiveOrgans();
    return NextResponse.json({ success: true, count: organs.length, organs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      organType = 'HEART',
      bloodGroup = 'O_POS',
      donorHospital = 'AIIMS_DELHI',
      city = 'New Delhi',
      ischemiaHours = 6,
      urgencyTier = 'TIER_1_CRITICAL',
      hla = { hla_A: '02:01/24:02', hla_B: '35:01/44:03', hla_DR: '04:01/11:01' },
      donorRef = `ANON-DONOR-${Math.floor(1000 + Math.random() * 9000)}-${city.slice(0, 3).toUpperCase()}`,
    } = body;

    const walletClient = getWalletArkivClient();
    const publicClient = getPublicArkivClient();

    let entityKey = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    let txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    let isRealOnChain = false;

    if (walletClient && walletClient.account) {
      try {
        const balance = await publicClient.getBalance({ address: walletClient.account.address });
        if (balance > 0n) {
          const currentBlock = await publicClient.getBlockNumber();
          const payload = jsonToPayload({
            donorRef,
            harvestBlock: Number(currentBlock),
            harvestTimestamp: Math.floor(Date.now() / 1000),
            hlaCompatibility: hla,
            perfusionSolution: 'University_of_Wisconsin_Cold_Perfusion',
            targetTemperatureCelsius: 4.0,
          });

          // If <= 1 hour requested, use fromMinutes for quick demo inspection, otherwise fromHours
          const ttl = ischemiaHours <= 1 ? ExpirationTime.fromMinutes(30) : ExpirationTime.fromHours(Number(ischemiaHours));

          const res = await walletClient.createEntity({
            payload,
            contentType: 'application/json',
            attributes: {
              app: str('organprotocol'),
              entity_type: str('ORGAN_HARVEST'),
              organ_type: str(organType),
              blood_group: str(bloodGroup),
              status: str('HARVESTED'),
              donor_hospital: str(donorHospital),
              city: str(city),
              ischemia_hours: i32(Number(ischemiaHours)),
              urgency_tier: str(urgencyTier),
            },
            expires: ttl,
          });

          entityKey = res.entityKey;
          txHash = res.txHash;
          isRealOnChain = true;
        }
      } catch (mutationErr: any) {
        console.warn('On-chain mutation attempt caught:', mutationErr.message);
      }
    }

    const newOrgan: OrganItem = {
      key: entityKey,
      organType,
      bloodGroup,
      status: 'HARVESTED',
      donorHospital,
      city,
      ischemiaHours: Number(ischemiaHours),
      urgencyTier,
      remainingSeconds: Number(ischemiaHours) * 3600,
      donorRef,
      hla,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      isRealOnChain,
      entityKey,
      txHash,
      organ: newOrgan,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { entityKey, status } = body;

    const walletClient = getWalletArkivClient();
    const publicClient = getPublicArkivClient();
    let isRealOnChain = false;

    if (walletClient && walletClient.account && entityKey) {
      try {
        const balance = await publicClient.getBalance({ address: walletClient.account.address });
        if (balance > 0n) {
          await walletClient.patchEntity({
            entityKey: entityKey as `0x${string}`,
            set: {
              status: str(status),
            },
          });
          isRealOnChain = true;
        }
      } catch (err: any) {
        console.warn('Patch entity caught:', err.message);
      }
    }

    return NextResponse.json({
      success: true,
      entityKey,
      status,
      isRealOnChain,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
