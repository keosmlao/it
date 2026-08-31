'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { saveArticle, type ActionState } from './actions'

type Category = { code: string; name_lo: string }
type Article = {
  id: string
  title: string
  body: string
  category_code: string | null
  keywords: string | null
  is_published: boolean
}

const inputClass =
  'input mt-1.5 w-full rounded-lg px-3 py-2'

export default function ArticleForm({
  categories,
  article,
}: {
  categories: Category[]
  article?: Article
}) {
  const [state, formAction] = useActionState(saveArticle, {} as ActionState)

  return (
    <form
      action={formAction}
      className="mt-6 glass-card rounded-2xl p-6"
    >
      {article && <input type="hidden" name="id" value={article.id} />}

      <label className="block text-sm font-medium text-body">
        ຫົວຂໍ້
        <input
          name="title"
          required
          maxLength={200}
          defaultValue={article?.title}
          className={inputClass}
        />
      </label>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm font-medium text-body">
          ປະເພດ
          <select
            name="category_code"
            defaultValue={article?.category_code ?? ''}
            className={inputClass}
          >
            <option value="">— ບໍ່ລະບຸ —</option>
            {categories.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name_lo}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-body">
          ຄຳຄົ້ນຫາ (ຂັ້ນດ້ວຍຈຸດ)
          <input
            name="keywords"
            maxLength={300}
            defaultValue={article?.keywords ?? ''}
            placeholder="printer, ພິມບໍ່ອອກ, driver"
            className={inputClass}
          />
        </label>
      </div>

      <label className="mt-4 block text-sm font-medium text-body">
        ເນື້ອຫາ / ຂັ້ນຕອນແກ້ໄຂ
        <textarea
          name="body"
          rows={14}
          required
          defaultValue={article?.body}
          placeholder={'1. ກວດສາຍໄຟ ແລະ ສາຍ USB\n2. ເປີດ Devices and Printers…'}
          className={`${inputClass} font-mono text-sm`}
        />
      </label>

      <label className="mt-4 flex items-center gap-2 text-sm text-body">
        <input
          type="checkbox"
          name="is_published"
          defaultChecked={article?.is_published ?? true}
          className="size-4"
        />
        ເຜີຍແຜ່ໃຫ້ທີມເຫັນ
      </label>

      {state.error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {state.error}
        </p>
      )}

      <Submit isEdit={!!article} />
    </form>
  )
}

function Submit({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-6 btn-primary rounded px-3 py-1.5 font-medium"
    >
      {pending ? 'ກຳລັງບັນທຶກ…' : isEdit ? 'ບັນທຶກການແກ້ໄຂ' : 'ເຜີຍແຜ່ບົດຄວາມ'}
    </button>
  )
}
