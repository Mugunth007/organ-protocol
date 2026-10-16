import { NextResponse } from 'next/server';
import {
  fetchLiveRecipients,
  getWalletArkivClient,
  getPublicArkivClient,
  RecipientItem,
} from '@/lib/arkivClient';
import { str, i32, u64, jsonToPayload, ExpirationTime } from '@arkiv-network/sdk';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const recipients = await fetchLiveRecipients();
    return NextResponse.json({ success: true, count: recipients.length, recipients });
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
      priorityScore = 90,
      hospitalNode = 'AIIMS_DELHI',
      clinicalNotes = 'Critical organ transplant candidate',
      recipientRef = `ANON-REC-${Math.floor(1000 + Math.random() * 9000)}-${hospitalNode.slice(0, 3)}`,
    } = body;

    const walletClient = getWalletArkivClient();
    const publicClient = getPublicArkivClient();

    let entityKey = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    let txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    let isRealOnChain = false;
    let registeredBlock = 646450;

    if (walletClient && walletClient.account) {
      try {
        const balance = await publicClient.getBalance({ address: walletClient.account.address });
        const currentBlock = await publicClient.getBlockNumber();
        registeredBlock = Number(currentBlock);

        if (balance > 0n) {
          const payload = jsonToPayload({
            recipientRef,
            clinicalNotes,
            registeredBlock,
            registeredTimestamp: Math.floor(Date.now() / 1000),
          });

          const res = await walletClient.createEntity({
            payload,
            contentType: 'application/json',
            attributes: {
              app: str('organprotocol'),
              entity_type: str('RECIPIENT_WAITLIST'),
              organ_type: str(organType),
              blood_group: str(bloodGroup),
              priority_score: i32(Number(priorityScore)),
              hospital_node: str(hospitalNode),
              status: str('WAITING'),
              waitlist_block: u64(currentBlock),
            },
            expires: ExpirationTime.fromDays(90),
          });

          entityKey = res.entityKey;
          txHash = res.txHash;
          isRealOnChain = true;
        }
      } catch (mutationErr: any) {
        console.warn('On-chain recipient registration caught:', mutationErr.message);
      }
    }

    const newRecipient: RecipientItem = {
      key: entityKey,
      recipientRef,
      organType,
      bloodGroup,
      priorityScore: Number(priorityScore),
      hospitalNode,
      status: 'WAITING',
      registeredBlock,
      clinicalNotes,
    };

    return NextResponse.json({
      success: true,
      isRealOnChain,
      entityKey,
      txHash,
      recipient: newRecipient,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
