/** ທະບຽນຜູ້ຂາຍ / ຜູ້ໃຫ້ບໍລິການ — ຄ່າຄົງທີ່ທີ່ໃຊ້ໄດ້ທັງ server ແລະ client */

export type VendorRow = {
  id: string
  name: string
  short_name: string | null
  erp_supplier_code: string | null
  erp_supplier_name: string | null
  contact_name: string | null
  phone: string | null
  email: string | null
  website: string | null
  address: string | null
  support_phone: string | null
  support_email: string | null
  support_hours: string | null
  sla_note: string | null
  note: string | null
  is_active: boolean
  created_by: number
  created_by_name: string | null
  created_at: string
  updated_at: string
  subscription_count: string
  repair_count: string
  repair_cost: string
}

export type VendorSpend = {
  vendor_id: string
  currency: string
  subscription_count: string
  amount_per_cycle: string
  yearly_amount: string
}
