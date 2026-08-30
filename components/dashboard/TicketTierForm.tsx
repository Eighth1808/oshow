'use client'

interface TicketTier {
  id: string
  name: string
  price: number | ''
  quantity: number | ''
  description: string
}

interface TicketTierFormProps {
  tier: TicketTier
  index: number
  isFree: boolean
  canRemove: boolean
  onUpdate: (updates: Partial<TicketTier>) => void
  onRemove: () => void
}

export default function TicketTierForm({
  tier,
  index,
  isFree,
  canRemove,
  onUpdate,
  onRemove,
}: TicketTierFormProps) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-400">Billet #{index + 1}</span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-sm text-red-500 hover:text-red-600"
          >
            Supprimer
          </button>
        )}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nom *</label>
          <input
            type="text"
            value={tier.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="VIP, Standard, Table..."
            className="input-field mt-1"
            required
          />
        </div>
        {!isFree && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Prix (FCFA) *</label>
            <input
              type="number"
              min={0}
              value={tier.price}
              onChange={(e) => onUpdate({ price: e.target.value === '' ? '' : parseInt(e.target.value) })}
              placeholder="5000"
              className="input-field mt-1"
              required
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700">Quantité *</label>
          <input
            type="number"
            min={1}
            value={tier.quantity}
            onChange={(e) => onUpdate({ quantity: e.target.value === '' ? '' : parseInt(e.target.value) })}
            placeholder="100"
            className="input-field mt-1"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <input
            type="text"
            value={tier.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Accès backstage, open bar..."
            className="input-field mt-1"
          />
        </div>
      </div>
    </div>
  )
}
