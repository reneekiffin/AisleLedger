import { useMemo, useState } from 'react'
import { useWedding, useWeddingTable } from '../../state/WeddingProvider'
import { useTrackedAction } from '../../hooks/useAutosave'
import { Screen } from '../../components/Screen'
import { Card, EmptyState, Pill, SectionHeader, StatTile } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { ConfirmSheet, Sheet } from '../../components/ui/Sheet'
import { CurrencyField, SelectField, TextArea, TextField, Toggle } from '../../components/ui/Field'
import { PlusIcon } from '../../components/nav/Icons'
import { formatMoney, parseMoney } from '../../lib/money'
import {
  PARTY_ROLES,
  addPartyMember,
  addShopLink,
  deletePartyMember,
  deleteShopLink,
  listParty,
  listShopLinks,
  updatePartyMember,
} from '../../db/repo'

/** Roles are grouped so a long party still reads as a list of small groups. */
const ROLE_ORDER = new Map(PARTY_ROLES.map((role, index) => [role, index]))

function MemberSheet({ open, onClose, member, currency, onSubmit, onDelete }) {
  const editing = !!member
  const [form, setForm] = useState({})
  const [seeded, setSeeded] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const key = member?.id ?? '__new'
  if (open && seeded !== key) {
    setSeeded(key)
    setForm({
      name: member?.name ?? '',
      role: member?.role ?? 'Bridesmaid',
      phone: member?.phone ?? '',
      email: member?.email ?? '',
      outfit: member?.outfit ?? '',
      outfitUrl: member?.outfitUrl ?? '',
      size: member?.size ?? '',
      colour: member?.colour ?? '',
      cost: member ? String(member.cost || '') : '',
      paidBy: member?.paidBy ?? '',
      ordered: !!member?.ordered,
      notes: member?.notes ?? '',
    })
  }
  if (!open && seeded !== null) setSeeded(null)

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={editing ? form.name || 'Edit' : 'Add to the party'}
        footer={
          <div className="flex gap-3 pb-1">
            {editing && (
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Remove
              </Button>
            )}
            <Button
              full
              disabled={!form.name?.trim()}
              onClick={() => {
                onSubmit({ ...form, cost: parseMoney(form.cost) })
                onClose()
              }}
            >
              {editing ? 'Save' : 'Add'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <TextField
            label="Name"
            autoCapitalize="words"
            value={form.name ?? ''}
            onChange={(e) => set('name', e.target.value)}
          />
          <SelectField label="Role" value={form.role} onChange={(e) => set('role', e.target.value)}>
            {PARTY_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Phone"
            type="tel"
            inputMode="tel"
            value={form.phone ?? ''}
            onChange={(e) => set('phone', e.target.value)}
          />
          <TextField
            label="Email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            value={form.email ?? ''}
            onChange={(e) => set('email', e.target.value)}
          />

          <div className="border-t border-line pt-5">
            <p className="eyebrow mb-3">What they're wearing</p>
            <div className="space-y-5">
              <TextField
                label="Outfit"
                placeholder="Birdy Grey — Ryan dress"
                value={form.outfit ?? ''}
                onChange={(e) => set('outfit', e.target.value)}
              />
              <TextField
                label="Where to buy it"
                type="url"
                inputMode="url"
                autoCapitalize="none"
                placeholder="birdygrey.com/products/…"
                hint="Paste the exact product page so nobody orders the wrong shade"
                value={form.outfitUrl ?? ''}
                onChange={(e) => set('outfitUrl', e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="Size"
                  value={form.size ?? ''}
                  onChange={(e) => set('size', e.target.value)}
                />
                <TextField
                  label="Colour"
                  placeholder="Sage"
                  value={form.colour ?? ''}
                  onChange={(e) => set('colour', e.target.value)}
                />
              </div>
              <CurrencyField
                label="Cost"
                currency={currency}
                value={form.cost ?? ''}
                onChange={(value) => set('cost', value)}
              />
              <TextField
                label="Paid by"
                placeholder="Her own / us"
                value={form.paidBy ?? ''}
                onChange={(e) => set('paidBy', e.target.value)}
              />
              <Toggle
                label="Ordered"
                description="Tick once it's actually bought"
                checked={!!form.ordered}
                onChange={(next) => set('ordered', next)}
              />
            </div>
          </div>

          <TextArea
            label="Notes"
            rows={3}
            value={form.notes ?? ''}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>
      </Sheet>

      <ConfirmSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          onDelete()
          onClose()
        }}
        title={`Remove ${member?.name}?`}
        body="They'll be taken off the wedding party list. Nothing else is affected."
        confirmLabel="Remove"
      />
    </>
  )
}

function ShopLinkSheet({ open, onClose, onSubmit }) {
  const [form, setForm] = useState({ label: '', url: '', forRole: 'Bridesmaid', note: '' })
  const [seeded, setSeeded] = useState(false)

  if (open && !seeded) {
    setSeeded(true)
    setForm({ label: '', url: '', forRole: 'Bridesmaid', note: '' })
  }
  if (!open && seeded) setSeeded(false)

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add a shop"
      description="Somewhere the party can go and buy their outfit"
      footer={
        <div className="pb-1">
          <Button
            full
            disabled={!form.label.trim() || !form.url.trim()}
            onClick={() => {
              onSubmit(form)
              onClose()
            }}
          >
            Add shop
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <TextField
          label="Shop name"
          placeholder="Birdy Grey"
          value={form.label}
          onChange={(e) => set('label', e.target.value)}
        />
        <TextField
          label="Link"
          type="url"
          inputMode="url"
          autoCapitalize="none"
          placeholder="birdygrey.com"
          hint="https:// is added for you if you leave it off"
          value={form.url}
          onChange={(e) => set('url', e.target.value)}
        />
        <SelectField label="For" value={form.forRole} onChange={(e) => set('forRole', e.target.value)}>
          {['Bridesmaid', 'Groomsman', 'Flower Girl', 'Ring Bearer', 'Everyone'].map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Note"
          placeholder="Colour: Sage. Order by 1 March."
          value={form.note}
          onChange={(e) => set('note', e.target.value)}
        />
      </div>
    </Sheet>
  )
}

export default function WeddingParty() {
  const { weddingId, currency } = useWedding()
  const party = useWeddingTable(listParty) ?? []
  const shops = useWeddingTable(listShopLinks) ?? []
  const track = useTrackedAction()

  const [editing, setEditing] = useState(null) // member | '__new' | null
  const [addingShop, setAddingShop] = useState(false)

  const grouped = useMemo(() => {
    const groups = new Map()
    for (const member of party) {
      if (!groups.has(member.role)) groups.set(member.role, [])
      groups.get(member.role).push(member)
    }
    return [...groups.entries()].sort(
      ([a], [b]) => (ROLE_ORDER.get(a) ?? 99) - (ROLE_ORDER.get(b) ?? 99),
    )
  }, [party])

  const totals = useMemo(() => {
    const cost = party.reduce((t, m) => t + (Number(m.cost) || 0), 0)
    const ordered = party.filter((m) => m.ordered).length
    return { cost, ordered }
  }, [party])

  const editorOpen = editing !== null
  const editingMember = editing === '__new' ? null : editing

  return (
    <Screen
      title="Wedding party"
      back="/more"
      action={
        <button
          type="button"
          onClick={() => setEditing('__new')}
          aria-label="Add someone to the wedding party"
          className="tap flex items-center justify-center rounded-full bg-primary text-white focus-ring"
        >
          <PlusIcon width={20} height={20} />
        </button>
      }
    >
      {party.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="In the party" value={party.length} />
          <StatTile label="Outfits ordered" value={`${totals.ordered}/${party.length}`} tone="primary" />
          <StatTile label="Outfit cost" value={formatMoney(totals.cost, currency)} />
        </div>
      )}

      <section className={party.length > 0 ? 'mt-7' : ''}>
        <SectionHeader
          title="Where to shop"
          hint="Share these so everyone buys the right thing"
          action={
            <Button size="sm" variant="soft" onClick={() => setAddingShop(true)}>
              Add
            </Button>
          }
        />
        {shops.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">
              Add the shops you've chosen — bridesmaid dresses, suits, shoes — so nobody has to ask
              you for the link twice.
            </p>
          </Card>
        ) : (
          <ul className="space-y-2.5">
            {shops
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((shop) => (
                <li key={shop.id}>
                  <Card className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{shop.label}</p>
                        <Pill tone="considering">{shop.forRole}</Pill>
                      </div>
                      {shop.note && <p className="mt-0.5 text-sm text-muted">{shop.note}</p>}
                    </div>
                    <Button
                      as="a"
                      href={shop.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      size="sm"
                      variant="soft"
                    >
                      Open
                    </Button>
                    <button
                      type="button"
                      aria-label={`Remove ${shop.label}`}
                      onClick={() => track(() => deleteShopLink(shop.id))}
                      className="tap shrink-0 rounded-lg text-muted focus-ring"
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  </Card>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="mt-7">
        {party.length === 0 ? (
          <EmptyState
            title="Build your wedding party"
            body="Add the people standing beside you, then track what they're wearing, what it costs and whether it's been ordered."
            action={<Button onClick={() => setEditing('__new')}>Add the first one</Button>}
          />
        ) : (
          <div className="space-y-6">
            {grouped.map(([role, members]) => (
              <div key={role}>
                <SectionHeader title={role} hint={`${members.length}`} />
                <ul className="space-y-2.5">
                  {members.map((member) => (
                    <li key={member.id}>
                      <Card>
                        <button
                          type="button"
                          onClick={() => setEditing(member)}
                          className="flex w-full items-start gap-3 text-left focus-ring rounded-lg"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-medium">{member.name}</p>
                              {member.ordered && <Pill tone="booked">Ordered</Pill>}
                            </div>
                            {member.outfit && (
                              <p className="mt-0.5 truncate text-sm text-muted">{member.outfit}</p>
                            )}
                            {(member.size || member.colour || member.cost > 0) && (
                              <p className="mt-0.5 text-sm text-muted">
                                {[
                                  member.size && `Size ${member.size}`,
                                  member.colour,
                                  member.cost > 0 && formatMoney(member.cost, currency),
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </p>
                            )}
                          </div>
                        </button>

                        {(member.outfitUrl || member.phone || member.email) && (
                          <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                            {member.outfitUrl && (
                              <Button
                                as="a"
                                href={member.outfitUrl}
                                target="_blank"
                                rel="noreferrer noopener"
                                size="sm"
                                variant="soft"
                              >
                                Buy the outfit
                              </Button>
                            )}
                            {member.phone && (
                              <Button as="a" href={`tel:${member.phone}`} size="sm" variant="secondary">
                                Call
                              </Button>
                            )}
                            {member.email && (
                              <Button
                                as="a"
                                href={`mailto:${member.email}`}
                                size="sm"
                                variant="secondary"
                              >
                                Email
                              </Button>
                            )}
                          </div>
                        )}
                      </Card>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <MemberSheet
        open={editorOpen}
        onClose={() => setEditing(null)}
        member={editingMember}
        currency={currency}
        onSubmit={(values) =>
          track(() =>
            editingMember
              ? updatePartyMember(editingMember.id, values)
              : addPartyMember(weddingId, values),
          )
        }
        onDelete={() => editingMember && track(() => deletePartyMember(editingMember.id))}
      />

      <ShopLinkSheet
        open={addingShop}
        onClose={() => setAddingShop(false)}
        onSubmit={(values) => track(() => addShopLink(weddingId, values))}
      />
    </Screen>
  )
}
