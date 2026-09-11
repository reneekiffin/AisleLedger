import { useMemo, useState } from 'react'
import { useWedding, useWeddingTable } from '../../state/WeddingProvider'
import { useTrackedAction } from '../../hooks/useAutosave'
import { Screen } from '../../components/Screen'
import { Card, EmptyState, Pill, SectionHeader, StatTile } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { ConfirmSheet, Sheet } from '../../components/ui/Sheet'
import { CurrencyField, SelectField, TextArea, TextField, Toggle } from '../../components/ui/Field'
import { PlusIcon } from '../../components/nav/Icons'
import { buildPartyShare, encodeShare, isTooLong, shareLink, shareUrl } from '../../lib/sharelink'
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

function MemberSheet({ open, onClose, member, prefill, currency, suggestions, onSubmit, onDelete }) {
  const editing = !!member
  const [form, setForm] = useState({})
  const [seeded, setSeeded] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // `prefill` is a member being copied: everything comes across except the
  // name, which is the one field that genuinely has to be retyped.
  const source = member ?? prefill
  const key = member?.id ?? (prefill ? `copy-${prefill.id}` : '__new')

  if (open && seeded !== key) {
    setSeeded(key)
    setForm({
      name: member?.name ?? '',
      role: source?.role ?? 'Bridesmaid',
      phone: member?.phone ?? '',
      email: member?.email ?? '',
      outfit: source?.outfit ?? '',
      outfitUrl: source?.outfitUrl ?? '',
      size: member?.size ?? '',
      colour: source?.colour ?? '',
      cost: source ? String(source.cost || '') : '',
      paidBy: source?.paidBy ?? '',
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
        title={editing ? form.name || 'Edit' : prefill ? `Another like ${prefill.name}` : 'Add to the party'}
        description={prefill ? 'Outfit, colour and cost copied — just add the name' : undefined}
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
                list="party-outfits"
                hint={suggestions.outfits.length ? 'Tap the field to reuse one you already entered' : undefined}
                value={form.outfit ?? ''}
                onChange={(e) => set('outfit', e.target.value)}
              />
              <TextField
                label="Where to buy it"
                type="url"
                inputMode="url"
                autoCapitalize="none"
                placeholder="birdygrey.com/products/…"
                list="party-urls"
                hint="Paste the exact product page so nobody orders the wrong shade"
                value={form.outfitUrl ?? ''}
                onChange={(e) => set('outfitUrl', e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="Size"
                  list="party-sizes"
                  value={form.size ?? ''}
                  onChange={(e) => set('size', e.target.value)}
                />
                <TextField
                  label="Colour"
                  placeholder="Sage"
                  list="party-colours"
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
                list="party-payers"
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

          {/* Everything already typed for someone else, one tap away. */}
          {Object.entries({
            'party-outfits': suggestions.outfits,
            'party-colours': suggestions.colours,
            'party-sizes': suggestions.sizes,
            'party-payers': suggestions.payers,
            'party-urls': suggestions.urls,
          }).map(([id, values]) => (
            <datalist key={id} id={id}>
              {values.map((value) => (
                <option key={value} value={value} />
              ))}
            </datalist>
          ))}
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
  const { wedding, weddingId, currency } = useWedding()
  const party = useWeddingTable(listParty) ?? []
  const shops = useWeddingTable(listShopLinks) ?? []
  const track = useTrackedAction()

  const [editing, setEditing] = useState(null) // member | '__new' | null
  const [prefill, setPrefill] = useState(null) // member being copied
  const [addingShop, setAddingShop] = useState(false)
  const [note, setNote] = useState('')

  // Anything already typed for one person becomes a suggestion for the next.
  const suggestions = useMemo(() => {
    const unique = (key) => [...new Set(party.map((m) => m[key]).filter(Boolean))].sort()
    return {
      outfits: unique('outfit'),
      colours: unique('colour'),
      sizes: unique('size'),
      payers: unique('paidBy'),
      urls: unique('outfitUrl'),
    }
  }, [party])

  const sharePartyList = async () => {
    const fragment = await encodeShare(buildPartyShare(wedding, party, shops))
    const url = shareUrl(fragment)
    if (isTooLong(url)) {
      setNote('This list is too long to fit in a link.')
      return
    }
    const outcome = await shareLink(url, 'What to wear')
    if (outcome === 'copied') setNote('Link copied — send it to the party.')
    else if (outcome === 'failed') setNote("Couldn't share the link on this device.")
  }

  const duplicate = (member) => {
    setPrefill(member)
    setEditing('__new')
  }

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

                        <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                          <Button size="sm" variant="secondary" onClick={() => duplicate(member)}>
                            Add another like this
                          </Button>
                        </div>

                        {(member.outfitUrl || member.phone || member.email) && (
                          <div className="mt-2 flex flex-wrap gap-2">
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

      {party.length > 0 && (
        <section className="mt-7">
          <Button full variant="secondary" onClick={sharePartyList}>
            Share the list with the party
          </Button>
          {note && <p className="mt-2 text-center text-sm text-muted">{note}</p>}
          <p className="mt-3 text-center text-xs leading-relaxed text-muted">
            Sends a read-only page with outfits, sizes, colours and shop links. Phone numbers,
            emails and costs are left out. The link carries the data inside it — nothing is
            uploaded, but anyone with the link can open it.
          </p>
        </section>
      )}

      <MemberSheet
        open={editorOpen}
        onClose={() => {
          setEditing(null)
          setPrefill(null)
        }}
        member={editingMember}
        prefill={editingMember ? null : prefill}
        suggestions={suggestions}
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
