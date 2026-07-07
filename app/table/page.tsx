import type { Metadata } from 'next'
import { TableRoom } from '@/components/table/table-room'

export const metadata: Metadata = {
  title: 'At the Table — House Edge',
  description: 'Six decks, one seat. Play your hand.',
}

export default function TablePage() {
  return <TableRoom />
}
