'use client'

import { useEffect, useState } from 'react'

/**
 * ໂມງເດີນຈິງໃນ hero card. ເລີ່ມຕົ້ນວ່າງເປົ່າແລ້ວຄ່ອຍເຕີມຫຼັງ mount
 * ເພື່ອບໍ່ໃຫ້ເວລາຂອງ server ກັບ browser ຂັດກັນຕອນ hydrate.
 */
export default function LiveClock() {
  const [time, setTime] = useState('')

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString('lo-LA', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: 'Asia/Vientiane',
        })
      )

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <span className="font-mono tabular-nums" suppressHydrationWarning>
      {time || '--:--:--'}
    </span>
  )
}
