'use client'

import { useState } from 'react'
import ActionForm, { SubmitButton } from '@/components/action-form'
import { safeDate } from '@/lib/assets/model'
import type { LocalAsset } from '@/lib/assets/local'
import AssetForm from '../new/asset-form'
import { setLocalAssetActive } from '../local-actions'

type Option = { code: string; name: string }

/**
 * ກາຕັດທີ່ຂຶ້ນສະເພາະອຸປະກອນທີ່ລົງທະບຽນໃນລະບົບນີ້ (ລະຫັດ ITA-…)
 *
 * ບອກໃຫ້ຊັດວ່າຂໍ້ມູນນີ້ບໍ່ໄດ້ມາຈາກ ERP — ຄົນເບິ່ງຈະໄດ້ຮູ້ວ່າຫາໃນ ERP ບໍ່ພົບ
 * ບໍ່ແມ່ນຂໍ້ມູນຫາຍ
 */
export default function LocalAssetPanel({
  asset,
  canManage,
  categories,
  locations,
  departments,
}: {
  asset: LocalAsset
  canManage: boolean
  categories: Option[]
  locations: Option[]
  departments: Option[]
}) {
  const [editing, setEditing] = useState(false)

  return (
    <section className="glass-card rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold text-fg">ທະບຽນຂອງລະບົບ IT</h2>
          <p className="mt-0.5 text-xs text-muted">
            ລົງທະບຽນ {safeDate(asset.registered_at)} · ບໍ່ໄດ້ມາຈາກ ERP
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!asset.is_active && (
            <span className="rounded-full bg-brand-orange/20 px-2.5 py-1 text-xs font-medium text-brand-orange">
              ປິດການໃຊ້ງານແລ້ວ
            </span>
          )}

          {canManage && (
            <>
              <button
                type="button"
                onClick={() => setEditing((v) => !v)}
                className="btn-secondary rounded-lg px-3 py-1.5 text-sm"
              >
                {editing ? 'ຍົກເລີກ' : 'ແກ້ຂໍ້ມູນ'}
              </button>

              <ActionForm action={setLocalAssetActive}>
                <input type="hidden" name="asset_code" value={asset.asset_code} />
                <input
                  type="hidden"
                  name="is_active"
                  value={asset.is_active ? '0' : '1'}
                />
                <SubmitButton className="btn-secondary rounded-lg px-3 py-1.5 text-sm">
                  {asset.is_active ? 'ປິດການໃຊ້ງານ' : 'ເປີດໃຊ້ຄືນ'}
                </SubmitButton>
              </ActionForm>
            </>
          )}
        </div>
      </div>

      {asset.source_note && (
        <p className="mt-3 rounded-lg bg-brand-blue/5 px-3 py-2 text-sm text-body">
          ໄດ້ມາແນວໃດ: {asset.source_note}
        </p>
      )}

      {editing && (
        <div className="mt-2">
          <AssetForm
            asset={asset}
            categories={categories}
            locations={locations}
            departments={departments}
          />
        </div>
      )}
    </section>
  )
}
