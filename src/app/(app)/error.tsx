'use client'

import { useEffect } from 'react'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <section className="glass-card mx-auto max-w-xl rounded-2xl p-8 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-red-500/10 text-2xl text-red-600">!</div>
      <h2 className="mt-4 text-xl font-bold text-fg">ບໍ່ສາມາດໂຫຼດໜ້ານີ້ໄດ້</h2>
      <p className="mt-2 text-sm text-muted">ກະລຸນາລອງໃໝ່. ຖ້າຍັງມີບັນຫາ ໃຫ້ແຈ້ງທີມ IT.</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-faint">Ref: {error.digest}</p>}
      <button type="button" onClick={reset} className="btn-primary mt-5 rounded-lg px-5 py-2 text-sm">ລອງໃໝ່</button>
    </section>
  )
}
