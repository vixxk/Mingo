import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoAdd, IoTrash, IoPencil, IoClose, IoCheckmark, IoWallet,
  IoCall, IoChatbubbles, IoVideocam, IoRefresh, IoStar, IoChevronBack,
  IoDiamond,
} from 'react-icons/io5'
import { adminAPI } from '../utils/api'
import ToastNotification from '../components/shared/ToastNotification'
import { Skeleton } from '../components/admin/Skeleton'

export default function Wallet() {
  const navigate = useNavigate()
  const [packages, setPackages] = useState([])
  const [walletSettings, setWalletSettings] = useState({ coinsPerDiamond: '10', diamondsPerUnit: '1', minWithdrawal: '' })
  const [earningRates, setEarningRates] = useState({ videoPayoutRate: '', audioPayoutRate: '', chatPayoutRate: '' })
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' })
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({
    name: '', coins: '', price: '', originalPrice: '', tag: '', discount: '', isPopular: false,
  })
  const [deleteConfirm, setDeleteConfirm] = useState({ visible: false, id: null })
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({
    name: '', coins: '', price: '', originalPrice: '', tag: '', discount: '', isPopular: false,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [pkgRes, settingsRes] = await Promise.all([
        adminAPI.getCoinPackages(),
        adminAPI.getWalletSettings(),
      ])

      const pkgResponseData = pkgRes.data || pkgRes || {}
      const packagesList = pkgResponseData.coinPricing || pkgResponseData.packages || pkgResponseData || []
      setPackages(Array.isArray(packagesList) ? packagesList : [])

      const settingsData = settingsRes.data || settingsRes || {}

      const ratio = settingsData.coinToDiamondRatio ?? 1
      setWalletSettings({
        coinsPerDiamond: String(Math.round(ratio * 10) / 10 || 10),
        diamondsPerUnit: '1',
        minWithdrawal: String(settingsData.minWithdrawalLimit ?? settingsData.minWithdraw ?? ''),
      })

      setEarningRates({
        videoPayoutRate: String(settingsData.videoPayoutRate ?? ''),
        audioPayoutRate: String(settingsData.audioPayoutRate ?? ''),
        chatPayoutRate: String(settingsData.chatPayoutRate ?? ''),
      })
    } catch (e) {
      setToast({ visible: true, message: e.message || 'Failed to load wallet data', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type })
  }

  const handleEdit = (pkg) => {
    setEditingId(pkg._id)
    setEditForm({
      name: pkg.name ?? '',
      coins: String(pkg.coins ?? ''),
      price: String(pkg.price ?? ''),
      originalPrice: String(pkg.originalPrice ?? ''),
      tag: pkg.tag ?? '',
      discount: String(pkg.discount ?? ''),
      isPopular: pkg.isPopular ?? false,
    })
    setShowAddForm(false)
  }

  const handleSaveEdit = async (id) => {
    if (!editForm.coins || !editForm.price) {
      showToast('Coins and price are required', 'error')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: editForm.name,
        coins: Number(editForm.coins),
        price: Number(editForm.price),
        originalPrice: editForm.originalPrice ? Number(editForm.originalPrice) : undefined,
        tag: editForm.tag || undefined,
        discount: editForm.discount ? Number(editForm.discount) : undefined,
        isPopular: editForm.isPopular,
      }
      await adminAPI.updateCoinPackage(id, payload)
      const updated = packages.map(p => {
        if (p._id === id) {
          return { ...p, ...payload, originalPrice: payload.originalPrice ?? p.originalPrice, discount: payload.discount ?? p.discount, tag: payload.tag ?? p.tag }
        }
        if (payload.isPopular && p._id !== id) {
          return { ...p, isPopular: false }
        }
        return p
      })
      setPackages(updated)
      setEditingId(null)
      showToast('Package updated successfully')
    } catch (e) {
      showToast(e.message || 'Failed to update package', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
  }

  const handleDeleteClick = (id) => {
    setDeleteConfirm({ visible: true, id })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.id) return
    setSaving(true)
    try {
      await adminAPI.deleteCoinPackage(deleteConfirm.id)
      setPackages(packages.filter(p => p._id !== deleteConfirm.id))
      setDeleteConfirm({ visible: false, id: null })
      showToast('Package deleted successfully')
    } catch (e) {
      showToast(e.message || 'Failed to delete package', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAddPackage = async () => {
    if (!addForm.name || !addForm.coins || !addForm.price) {
      showToast('Name, coins, and price are required', 'error')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: addForm.name,
        coins: Number(addForm.coins),
        price: Number(addForm.price),
        originalPrice: addForm.originalPrice ? Number(addForm.originalPrice) : undefined,
        tag: addForm.tag || undefined,
        discount: addForm.discount ? Number(addForm.discount) : undefined,
        isPopular: addForm.isPopular,
      }
      const res = await adminAPI.addCoinPackage(payload)
      const newPkg = res.data || res.package || res
      const updated = addForm.isPopular
        ? packages.map(p => ({ ...p, isPopular: false })).concat(newPkg)
        : [...packages, newPkg]
      setPackages(updated)
      setShowAddForm(false)
      setAddForm({ name: '', coins: '', price: '', originalPrice: '', tag: '', discount: '', isPopular: false })
      showToast('Package added successfully')
    } catch (e) {
      showToast(e.message || 'Failed to add package', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleResetPackages = async () => {
    if (!window.confirm('Reset all coin packages to defaults? This cannot be undone.')) return
    setSaving(true)
    try {
      const res = await adminAPI.resetCoinPackages()
      const newPackages = res.data || res.packages || res || []
      setPackages(Array.isArray(newPackages) ? newPackages : [])
      showToast('Packages reset to defaults')
    } catch (e) {
      showToast(e.message || 'Failed to reset packages', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveWalletSettings = async () => {
    if (!walletSettings.coinsPerDiamond || !walletSettings.minWithdrawal) {
      showToast('All wallet settings fields are required', 'error')
      return
    }
    setSaving(true)
    try {
      const coins = Number(walletSettings.coinsPerDiamond)
      const diamonds = Number(walletSettings.diamondsPerUnit) || 1
      const ratio = coins / diamonds
      await adminAPI.updateWalletSettings({
        coinToDiamondRatio: ratio,
        minWithdrawalLimit: Number(walletSettings.minWithdrawal),
      })
      showToast('Wallet settings saved')
    } catch (e) {
      showToast(e.message || 'Failed to save wallet settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEarningRates = async () => {
    if (!earningRates.videoPayoutRate || !earningRates.audioPayoutRate || !earningRates.chatPayoutRate) {
      showToast('All earning rate fields are required', 'error')
      return
    }
    setSaving(true)
    try {
      await adminAPI.updateEarningRates({
        videoPayoutRate: Number(earningRates.videoPayoutRate),
        audioPayoutRate: Number(earningRates.audioPayoutRate),
        chatPayoutRate: Number(earningRates.chatPayoutRate),
      })
      showToast('Earning rates saved')
    } catch (e) {
      showToast(e.message || 'Failed to save earning rates', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 'var(--page-padding)', flex: 1, backgroundColor: 'var(--bg-primary)' }}>
        <Skeleton width={140} height={28} style={{ marginBottom: 24 }} />
        {[1, 2, 3].map(i => (
          <Skeleton key={i} width="100%" height={130} borderRadius={20} style={{ marginBottom: 15 }} />
        ))}
        <Skeleton width="100%" height={56} borderRadius={16} style={{ marginBottom: 32 }} />
        <Skeleton width={180} height={20} style={{ marginBottom: 15 }} />
        <Skeleton width="100%" height={200} borderRadius={20} />
      </div>
    )
  }

  return (
    <div className="page-wrap" style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', padding: 'var(--page-padding)' }}>
      <div className="page-hdr-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate(-1)}
            className="back-btn"
            style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff', flexShrink: 0,
            }}
          >
            <IoChevronBack size={20} />
          </button>
          <div className="icon-box" style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--accent-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IoWallet size={18} color="#fff" />
          </div>
          <h1 className="page-header-title" style={{ fontSize: 'var(--header-font-size)', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.3px' }}>Wallet</h1>
        </div>
      </div>

      {/* Coin Packages */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>Coin Packages</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setShowAddForm(!showAddForm); setEditingId(null) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                background: 'var(--accent-gradient)',
                color: '#fff', fontSize: 13, fontWeight: 700,
              }}
            >
              <IoAdd size={16} />
              Add Package
            </button>
            <button
              onClick={handleResetPackages}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', cursor: 'pointer',
                background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600,
              }}
            >
              <IoRefresh size={16} />
              Reset
            </button>
          </div>
        </div>

        {showAddForm && (
          <div style={{
            backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)',
            padding: 20, marginBottom: 16,
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>
              <IoAdd size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              New Package
            </div>
            <div className="wallet-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {['name', 'coins', 'price', 'originalPrice', 'tag', 'discount'].map(field => (
                <div key={field}>
                  <label style={{ color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'capitalize' }}>
                    {field.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  <input
                    value={addForm[field]}
                    onChange={e => setAddForm({ ...addForm, [field]: e.target.value })}
                    placeholder={field === 'originalPrice' ? 'Original price' : field === 'discount' ? 'Discount %' : field}
                    type={field === 'name' || field === 'tag' ? 'text' : 'number'}
                    style={{
                      width: '100%', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                      borderRadius: 10, color: '#fff', padding: '10px 12px', fontSize: 14,
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={addForm.isPopular}
                  onChange={e => setAddForm({ ...addForm, isPopular: e.target.checked })}
                  style={{ accentColor: 'var(--accent)' }}
                />
                <IoStar size={14} color="#F59E0B" />
                Popular
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                onClick={handleAddPackage}
                disabled={saving}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                  cursor: 'pointer', background: 'var(--accent-gradient)',
                  color: '#fff', fontSize: 14, fontWeight: 700,
                }}
              >
                {saving ? 'Saving...' : 'Add Package'}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setAddForm({ name: '', coins: '', price: '', originalPrice: '', tag: '', discount: '', isPopular: false }) }}
                style={{
                  padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)',
                  cursor: 'pointer', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {packages.length === 0 ? (
          <div style={{
            backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)',
            padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14,
          }}>
            No coin packages yet. Add one to get started.
          </div>
        ) : (
          packages.map(pkg => (
            <div
              key={pkg._id}
              className="wallet-package-card"
              style={{
                backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)',
                padding: 'var(--card-padding)', marginBottom: 12,
              }}
            >
              {editingId === pkg._id ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Editing: {editForm.name || pkg.name}</span>
                    <button onClick={handleCancelEdit} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      <IoClose size={20} />
                    </button>
                  </div>
                  <div className="wallet-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {['name', 'coins', 'price', 'originalPrice', 'tag', 'discount'].map(field => (
                      <div key={field}>
                        <label style={{ color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 3, textTransform: 'capitalize' }}>
                          {field.replace(/([A-Z])/g, ' $1').trim()}
                        </label>
                        <input
                          value={editForm[field]}
                          onChange={e => setEditForm({ ...editForm, [field]: e.target.value })}
                          placeholder={field}
                          type={field === 'name' || field === 'tag' ? 'text' : 'number'}
                          style={{
                            width: '100%', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)', color: '#fff', padding: '8px 10px', fontSize: 13,
                            outline: 'none', boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={editForm.isPopular}
                        onChange={e => setEditForm({ ...editForm, isPopular: e.target.checked })}
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      <IoStar size={14} color="#F59E0B" />
                      Popular
                    </label>
                  </div>
                  <button
                    onClick={() => handleSaveEdit(pkg._id)}
                    disabled={saving}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, marginTop: 12,
                      padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: 'var(--accent-gradient)', color: '#fff', fontSize: 13, fontWeight: 700,
                    }}
                  >
                    <IoCheckmark size={16} />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{pkg.name}</span>
                      {pkg.isPopular && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                          padding: '2px 8px', borderRadius: 6,
                          background: 'rgba(245,158,11,0.15)', color: '#F59E0B',
                          fontSize: 10, fontWeight: 700,
                        }}>
                          <IoStar size={10} />
                          Popular
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 18 }}>
                        {pkg.coins} coins
                      </span>
                      <span style={{ color: '#10B981', fontWeight: 700, fontSize: 16 }}>
                        {'\u20B9'}{pkg.price}
                      </span>
                      {pkg.originalPrice && Number(pkg.originalPrice) > Number(pkg.price) && (
                        <span style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'line-through' }}>
                          {'\u20B9'}{pkg.originalPrice}
                        </span>
                      )}
                      {pkg.discount && Number(pkg.discount) > 0 && (
                        <span style={{
                          padding: '2px 6px', borderRadius: 4,
                          background: 'rgba(239,68,68,0.15)', color: '#EF4444',
                          fontSize: 11, fontWeight: 700,
                        }}>
                          -{pkg.discount}%
                        </span>
                      )}
                      {pkg.tag && (
                        <span style={{
                          padding: '2px 6px', borderRadius: 4,
                          background: 'var(--accent-light)', color: 'var(--accent)',
                          fontSize: 11, fontWeight: 600,
                        }}>
                          {pkg.tag}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 12 }}>
                    <button
                      onClick={() => handleEdit(pkg)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)',
                        background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', cursor: 'pointer',
                      }}
                    >
                      <IoPencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(pkg._id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)',
                        background: 'rgba(239,68,68,0.08)', color: '#EF4444', cursor: 'pointer',
                      }}
                    >
                      <IoTrash size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Global Wallet Settings */}
      <div style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: '0 0 16px' }}>
          <IoWallet size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Global Wallet Settings
        </h2>
        <div style={{
          backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)',
          padding: 24,
        }}>
          {/* Coin to Diamond Ratio */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 10 }}>
              <IoDiamond size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Coin to Diamond Conversion
            </label>
            <div className="wallet-conversion-row" style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', borderRadius: 12,
              backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
            }}>
              <input
                value={walletSettings.coinsPerDiamond}
                onChange={e => setWalletSettings({ ...walletSettings, coinsPerDiamond: e.target.value })}
                placeholder="10"
                type="number"
                style={{
                  width: 80, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  borderRadius: 8, color: '#fff', padding: '8px 10px', fontSize: 16, fontWeight: 700,
                  textAlign: 'center', outline: 'none',
                }}
              />
              <span style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600 }}>
                coins
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: 18, fontWeight: 600 }}>=</span>
              <input
                value={walletSettings.diamondsPerUnit}
                onChange={e => setWalletSettings({ ...walletSettings, diamondsPerUnit: e.target.value })}
                placeholder="1"
                type="number"
                style={{
                  width: 80, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  borderRadius: 8, color: '#fff', padding: '8px 10px', fontSize: 16, fontWeight: 700,
                  textAlign: 'center', outline: 'none',
                }}
              />
              <span style={{ color: '#A855F7', fontSize: 14, fontWeight: 700 }}>
                <IoDiamond size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Diamond
              </span>
            </div>
            <div style={{
              marginTop: 8, fontSize: 11, color: 'var(--text-muted)', fontWeight: 500,
            }}>
              Sets how many coins equal one diamond. Both values are editable.
            </div>
          </div>

          {/* Min Withdrawal */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Min Withdrawal Amount ({'\u20B9'})
            </label>
            <input
              value={walletSettings.minWithdrawal}
              onChange={e => setWalletSettings({ ...walletSettings, minWithdrawal: e.target.value })}
              placeholder="e.g. 500"
              type="number"
              style={{
                width: '100%', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                borderRadius: 10, color: '#fff', padding: '12px 14px', fontSize: 14,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            onClick={handleSaveWalletSettings}
            disabled={saving}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
              cursor: 'pointer', background: 'var(--accent-gradient)',
              color: '#fff', fontSize: 15, fontWeight: 700,
            }}
          >
            {saving ? 'Saving...' : 'Save Wallet Settings'}
          </button>
        </div>
      </div>

      {/* Listener Earning Rates */}
      <div style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: '0 0 16px' }}>
          <IoCashIcon size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Listener Earning Rates
        </h2>
        <div style={{
          backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)',
          padding: 24,
        }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              <IoVideocam size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Video Call Payout Rate
            </label>
            <div className="wallet-earnings-row" style={{
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <input
                value={earningRates.videoPayoutRate}
                onChange={e => setEarningRates({ ...earningRates, videoPayoutRate: e.target.value })}
                placeholder="e.g. 40"
                type="number"
                style={{
                  flex: 1, backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                  borderRadius: 10, color: '#fff', padding: '12px 14px', fontSize: 14,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              <span style={{
                padding: '10px 14px', borderRadius: 10,
                backgroundColor: 'var(--accent-light)', color: 'var(--accent)',
                fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
              }}>
              coins / min
            </span>
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
            <IoCall size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Audio Call Payout Rate
          </label>
          <div className="wallet-earnings-row" style={{
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <input
              value={earningRates.audioPayoutRate}
              onChange={e => setEarningRates({ ...earningRates, audioPayoutRate: e.target.value })}
              placeholder="e.g. 10"
              type="number"
              style={{
                flex: 1, backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                borderRadius: 10, color: '#fff', padding: '12px 14px', fontSize: 14,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
            <span style={{
              padding: '10px 14px', borderRadius: 10,
              backgroundColor: 'var(--accent-light)', color: 'var(--accent)',
              fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
            }}>
              coins / min
            </span>
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
            <IoChatbubbles size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Chat Payout Rate
          </label>
          <div className="wallet-earnings-row" style={{
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <input
              value={earningRates.chatPayoutRate}
              onChange={e => setEarningRates({ ...earningRates, chatPayoutRate: e.target.value })}
              placeholder="e.g. 10"
              type="number"
              style={{
                flex: 1, backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                borderRadius: 10, color: '#fff', padding: '12px 14px', fontSize: 14,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
            <span style={{
              padding: '10px 14px', borderRadius: 10,
              backgroundColor: 'var(--accent-light)', color: 'var(--accent)',
              fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
            }}>
              coins / 5 min
            </span>
            </div>
          </div>
          <button
            onClick={handleSaveEarningRates}
            disabled={saving}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
              cursor: 'pointer', background: 'var(--accent-gradient)',
              color: '#fff', fontSize: 15, fontWeight: 700,
            }}
          >
            {saving ? 'Saving...' : 'Save Earning Rates'}
          </button>
        </div>
      </div>

      {/* Delete Confirmation Overlay */}
      {deleteConfirm.visible && (
        <div
          onClick={() => setDeleteConfirm({ visible: false, id: null })}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="confirm-dialog"
            style={{
              backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)',
              padding: 28, maxWidth: 360, width: '100%',
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
              Delete Package
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5, margin: '0 0 24px' }}>
              Are you sure you want to delete this coin package? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setDeleteConfirm({ visible: false, id: null })}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 10, border: '1px solid var(--border)',
                  cursor: 'pointer', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
                  fontSize: 14, fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={saving}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 10, border: 'none',
                  cursor: 'pointer', background: '#EF4444', color: '#fff',
                  fontSize: 14, fontWeight: 700,
                }}
              >
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastNotification
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </div>
  )
}

function IoCashIcon({ size, style }) {
  return (
    <span style={{ fontSize: size, lineHeight: 1, ...style }}>₹</span>
  )
}
