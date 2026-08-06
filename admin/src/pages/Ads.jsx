import { useState, useEffect, useSyncExternalStore } from 'react'
import { adminAPI } from '../utils/api'
import { Skeleton } from '../components/admin/Skeleton'
import { IoAdd, IoTrash, IoPencil, IoEye, IoEyeOff, IoImage, IoImages, IoClose, IoChevronBack, IoCheckmarkCircle, IoAlertCircle, IoTimer } from 'react-icons/io5'
import { useNavigate } from 'react-router-dom'

const useIsMobile = (breakpoint = 767) => {
  return useSyncExternalStore(
    (callback) => {
      const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)
      mq.addEventListener('change', callback)
      return () => mq.removeEventListener('change', callback)
    },
    () => window.innerWidth <= breakpoint,
    () => false
  )
}

export default function Ads() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showSavePopup, setShowSavePopup] = useState(false)
  const [showDeletePopup, setShowDeletePopup] = useState(false)
  const [popupType, setPopupType] = useState('success')
  const [popupMessage, setPopupMessage] = useState('')
  const [editingAd, setEditingAd] = useState(null)
  const [form, setForm] = useState({ title: '', link: '', isActive: true, order: 0 })
  const [imageFile, setImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [intervalDraft, setIntervalDraft] = useState('4')
  const [savingInterval, setSavingInterval] = useState(false)

  const fetchAds = async () => {
    try {
      const res = await adminAPI.getAds()
      setAds(res.data)
    } catch (e) {
      console.error('Failed to fetch ads', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAds()

    const loadSliderInterval = async () => {
      try {
        const res = await adminAPI.getSettings()
        const saved = res?.data?.sliderInterval
        if (saved !== undefined && saved !== null) {
          setIntervalDraft(String(saved))
        }
      } catch (e) {
        console.error('Failed to load ad slider interval', e)
      }
    }
    loadSliderInterval()
  }, [])

  const handleSaveInterval = async () => {
    const val = parseInt(intervalDraft, 10)
    if (!val || isNaN(val) || val < 2 || val > 30) {
      setPopupType('error')
      setPopupMessage('Ad slider interval must be greater than 1 (between 2 and 30 seconds)')
      setShowSavePopup(true)
      return
    }
    setSavingInterval(true)
    try {
      await adminAPI.updateSettings({ sliderInterval: val })
      setIntervalDraft(String(val))
      setPopupType('success')
      setPopupMessage(`Ad slider interval saved to ${val} sec`)
      setShowSavePopup(true)
    } catch (err) {
      console.error('Failed to save slider interval', err)
      setPopupType('error')
      setPopupMessage('Failed to save slider interval: ' + (err.message || 'Unknown error'))
      setShowSavePopup(true)
    } finally {
      setSavingInterval(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleOpenModal = (ad = null) => {
    if (ad) {
      setEditingAd(ad)
      setForm({ title: ad.title, link: ad.link, isActive: ad.isActive, order: ad.order })
      setPreviewUrl(ad.imageUrl)
    } else {
      setEditingAd(null)
      setForm({ title: '', link: '', isActive: true, order: 0 })
      setPreviewUrl('')
    }
    setImageFile(null)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setUploading(true)
    try {
      let imageUrl = form.imageUrl || previewUrl

      if (imageFile) {
        const urlRes = await adminAPI.getAdUploadUrl({ fileName: imageFile.name, fileType: imageFile.type })
        const { uploadUrl, fileUrl } = urlRes.data

        await fetch(uploadUrl, {
          method: 'PUT',
          body: imageFile,
          headers: { 'Content-Type': imageFile.type },
        })
        imageUrl = fileUrl
      }

      const payload = { ...form, imageUrl }

      if (editingAd) {
        await adminAPI.updateAd(editingAd._id, payload)
      } else {
        await adminAPI.createAd(payload)
      }

      setShowModal(false)
      setPopupType('success')
      setPopupMessage(editingAd ? 'Ad updated successfully' : 'Ad created successfully')
      setShowSavePopup(true)
      fetchAds()
    } catch (err) {
      console.error('Save failed', err)
      setPopupType('error')
      setPopupMessage('Failed to save ad: ' + (err.message || 'Unknown error'))
      setShowSavePopup(true)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id) => {
    setDeletingId(id)
    setShowDeletePopup(false)
    try {
      await adminAPI.deleteAd(id)
      setPopupType('success')
      setPopupMessage('Ad deleted successfully')
      setShowSavePopup(true)
      fetchAds()
    } catch (err) {
      console.error('Delete failed', err)
      setPopupType('error')
      setPopupMessage('Failed to delete ad')
      setShowSavePopup(true)
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleActive = async (ad) => {
    const prevAds = [...ads]
    setAds(ads.map(a => a._id === ad._id ? { ...a, isActive: !a.isActive } : a))
    try {
      await adminAPI.updateAd(ad._id, { ...ad, isActive: !ad.isActive })
    } catch (err) {
      console.error('Toggle failed', err)
      setAds(prevAds)
    }
  }

  return (
    <div className="page-wrap" style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', padding: 'var(--page-padding)' }}>
      {/* Header */}
      <div className="page-hdr-row ads-page-hdr" style={{ display: 'flex', alignItems: 'center', marginBottom: isMobile ? 10 : 16, gap: isMobile ? 8 : 12, flexWrap: 'wrap' }}>
        <button className="back-btn" onClick={() => navigate(-1)}
          style={{
            background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: isMobile ? 10 : 12,
            width: isMobile ? 32 : 40, height: isMobile ? 32 : 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0
          }}>
          <IoChevronBack size={isMobile ? 16 : 20} color="#fff" />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
          {/* Icon box hidden on mobile so the back arrow sits directly left of the title */}
          <div className="icon-box" style={{
            width: isMobile ? 28 : 36, height: isMobile ? 28 : 36, borderRadius: isMobile ? 8 : 10,
            background: 'var(--accent-gradient)',
            display: isMobile ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <IoImages size={isMobile ? 14 : 18} color="#fff" />
          </div>
          <h1 className="page-header-title" style={{
            color: 'var(--text-primary)',
            fontSize: 'var(--header-font-size)',
            fontWeight: 800, margin: 0, letterSpacing: '-0.3px',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
          }}>Ads Management</h1>
          <div style={{ flex: 1 }} />
          {/* Mobile: timer + save + add-new-ad share their own full-width row (shrunk to fit). Desktop: unchanged inline controls. */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: isMobile ? '100%' : undefined,
            order: isMobile ? 10 : undefined,
            marginRight: isMobile ? 0 : 8,
            marginTop: isMobile ? 4 : 0,
            justifyContent: isMobile ? 'space-between' : undefined,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 8, flexShrink: 0 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 8,
                background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', padding: isMobile ? '6px 10px' : '5px 12px',
                flexShrink: 0,
              }}>
                <IoTimer size={isMobile ? 14 : 16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={intervalDraft}
                  onChange={e => setIntervalDraft(e.target.value.replace(/\D/g, ''))}
                  aria-label="Ad slider interval in seconds"
                  style={{
                    width: isMobile ? 34 : 44, background: 'transparent', border: 'none', outline: 'none',
                    color: 'var(--text-primary)', fontSize: 13, textAlign: 'center',
                    padding: 0, boxSizing: 'border-box',
                  }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>sec</span>
              </div>
              <button
                onClick={handleSaveInterval}
                disabled={savingInterval}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: isMobile ? '7px 14px' : '8px 18px',
                  borderRadius: 'var(--radius-sm)', border: 'none',
                  background: 'var(--accent-gradient)', color: '#fff', fontWeight: 600,
                  fontSize: 12, cursor: savingInterval ? 'not-allowed' : 'pointer',
                  opacity: savingInterval ? 0.7 : 1, whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                {savingInterval ? 'Saving...' : 'Save'}
              </button>
            </div>
            <button
              onClick={() => handleOpenModal()}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? 4 : 8,
                padding: isMobile ? '7px 10px' : '10px 20px',
                borderRadius: 'var(--radius-md)', border: 'none',
                background: 'var(--accent-gradient)', color: '#fff', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: isMobile ? 12 : 14, whiteSpace: 'nowrap', flexShrink: 0
              }}
            >
              <IoAdd size={isMobile ? 14 : 18} /> Add New Ad
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: 16 }}>
          {isMobile ? (
            <>
              {[1, 2, 3].map(i => (
                <div key={i} style={{
                  display: 'flex', flexDirection: 'column', gap: 12, padding: 12,
                  background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)'
                }}>
                  <Skeleton width="100%" height={140} borderRadius="var(--radius-sm)" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <Skeleton width="60%" height={15} borderRadius={8} />
                    <Skeleton width="35%" height={13} borderRadius={8} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Skeleton width={56} height={18} borderRadius={12} />
                    <Skeleton width={48} height={12} borderRadius={8} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                    <Skeleton width="33.33%" height={36} borderRadius={8} />
                    <Skeleton width="33.33%" height={36} borderRadius={8} />
                    <Skeleton width="33.33%" height={36} borderRadius={8} />
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <Skeleton height={200} />
              <Skeleton height={200} />
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {ads.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                {isMobile ? (
                  <>
                    <div>No ads found.</div>
                    <div style={{ marginTop: 4 }}>Create your first ad!</div>
                  </>
                ) : (
                  <>No ads found. Create your first ad!</>
                )}
              </div>
          ) : (
            ads.map(ad => (
              <div key={ad._id} style={{
                display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? 12 : 20, padding: isMobile ? 12 : 16,
                background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)'
              }}>
                <div style={{ width: isMobile ? '100%' : 240, height: isMobile ? 140 : 120, borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--bg-tertiary)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {ad.imageUrl ? (
                    <a href={ad.imageUrl} target="_blank" rel="noopener noreferrer" style={{ width: '100%', height: '100%', display: 'block' }}>
                      <img src={ad.imageUrl} alt={ad.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </a>
                  ) : (
                    <IoImage size={40} color="var(--text-muted)" />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: isMobile ? 15 : 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{ad.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ad.link}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                      background: ad.isActive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: ad.isActive ? '#22C55E' : '#EF4444'
                    }}>
                      {ad.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Order: {ad.order}</span>
                  </div>
                </div>
                <div className="ad-actions" style={{ width: isMobile ? '100%' : undefined }}>
                  <button
                    onClick={() => handleToggleActive(ad)}
                    className={`ad-action-btn ${ad.isActive ? 'ad-action-btn--view' : 'ad-action-btn--view-off'}`}
                    style={{ flex: isMobile ? 1 : undefined, color: ad.isActive ? '#22C55E' : '#6B7280' }}
                    data-tooltip={ad.isActive ? 'Deactivate' : 'Activate'}
                    aria-label={ad.isActive ? 'Deactivate ad' : 'Activate ad'}
                  >
                    {ad.isActive ? <IoEye size={18} /> : <IoEyeOff size={18} />}
                  </button>
                  <button
                    onClick={() => handleOpenModal(ad)}
                    className="ad-action-btn ad-action-btn--edit"
                    style={{ flex: isMobile ? 1 : undefined, color: '#A855F7' }}
                    data-tooltip="Edit"
                    aria-label="Edit ad"
                  >
                    <IoPencil size={18} />
                  </button>
                  <button
                    onClick={() => { setDeletingId(ad._id); setShowDeletePopup(true) }}
                    className="ad-action-btn ad-action-btn--delete ad-action-btn--last"
                    style={{ flex: isMobile ? 1 : undefined, color: '#EF4444' }}
                    data-tooltip="Delete"
                    aria-label="Delete ad"
                  >
                    <IoTrash size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

       {/* Save Result Popup */}
       {showSavePopup && (
         <div
           style={{
             position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
             backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999,
             display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
           }}
           onClick={() => setShowSavePopup(false)}
         >
           <div
             style={{
               width: '100%', maxWidth: 340, backgroundColor: 'var(--bg-secondary)',
               borderRadius: 24, border: '1px solid var(--border)',
               padding: '32px 24px 24px',
               display: 'flex', flexDirection: 'column', alignItems: 'center',
             }}
             onClick={e => e.stopPropagation()}
           >
             <div style={{
               width: 64, height: 64, borderRadius: 32,
               backgroundColor: popupType === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
               display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
             }}>
               {popupType === 'success'
                 ? <IoCheckmarkCircle size={32} color="#10B981" />
                 : <IoAlertCircle size={32} color="#EF4444" />
               }
             </div>
             <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 8, textAlign: 'center' }}>
               {popupType === 'success' ? 'Success' : 'Error'}
             </span>
             <span style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.5, marginBottom: 24 }}>
               {popupMessage}
             </span>
             <button
               onClick={() => setShowSavePopup(false)}
               style={{
                 width: '100%', padding: '12px 0', borderRadius: 14, border: 'none',
                 background: popupType === 'success'
                   ? 'linear-gradient(135deg, #10B981, #059669)'
                   : 'linear-gradient(135deg, #EF4444, #DC2626)',
                 color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer',
               }}
             >
               Close
             </button>
           </div>
         </div>
       )}

       {/* Delete Confirmation Popup */}
       {showDeletePopup && (
         <div
           style={{
             position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
             backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999,
             display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
           }}
           onClick={() => setShowDeletePopup(false)}
         >
           <div
             style={{
               width: '100%', maxWidth: 340, backgroundColor: 'var(--bg-secondary)',
               borderRadius: 24, border: '1px solid var(--border)',
               padding: '32px 24px 24px',
               display: 'flex', flexDirection: 'column', alignItems: 'center',
             }}
             onClick={e => e.stopPropagation()}
           >
             <div style={{
               width: 64, height: 64, borderRadius: 32,
               backgroundColor: 'rgba(239,68,68,0.15)',
               display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
             }}>
               <IoAlertCircle size={32} color="#EF4444" />
             </div>
             <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 8, textAlign: 'center' }}>
               Delete Ad
             </span>
             <span style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.5, marginBottom: 24 }}>
               Are you sure you want to delete this ad? This action cannot be undone.
             </span>
             <div style={{ display: 'flex', gap: 12, width: '100%' }}>
               <button
                 onClick={() => setShowDeletePopup(false)}
                 style={{
                   flex: 1, padding: '12px 0', borderRadius: 14, border: '1px solid var(--border)',
                   background: 'transparent', color: 'var(--text-secondary)', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                 }}
               >
                 Cancel
               </button>
                  <button
                    onClick={() => deletingId && handleDelete(deletingId)}
                    disabled={!deletingId}
                    style={{
                      flex: 1, padding: '12px 0', borderRadius: 14, border: 'none',
                      background: !deletingId ? 'var(--bg-tertiary)' : 'linear-gradient(135deg, #EF4444, #DC2626)',
                      color: '#fff', fontSize: 15, fontWeight: 800, cursor: !deletingId ? 'not-allowed' : 'pointer',
                    }}
                  >
                     {!deletingId ? 'Delete' : 'Delete'}
                  </button>
             </div>
           </div>
         </div>
       )}

       {/* Modal */}
       {showModal && (
         <div style={{
           position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
           background: 'rgba(0,0,0,0.7)', zIndex: 9999,
           display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
         }}>
           <div style={{
             background: 'var(--bg-secondary)', borderRadius: 24, padding: 28,
             width: '100%', maxWidth: 520, border: '1px solid var(--border)',
             boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
           }}>
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                 <div style={{
                   width: 40, height: 40, borderRadius: 12,
                   background: 'var(--accent-gradient)',
                   display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                 }}>
                   <IoImages size={20} color="#fff" />
                 </div>
                 <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                   {editingAd ? 'Edit Ad' : 'Create New Ad'}
                 </h2>
               </div>
               <button type="button" onClick={() => setShowModal(false)} style={{
                 width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)',
                 background: 'var(--bg-tertiary)', color: 'var(--text-muted)', cursor: 'pointer',
                 display: 'flex', alignItems: 'center', justifyContent: 'center',
               }}>
                 <IoClose size={18} />
               </button>
             </div>
             <form onSubmit={handleSubmit}>
               <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                 <div style={{ flex: 2 }}>
                   <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Title</label>
                   <input
                     type="text"
                     value={form.title}
                     onChange={e => setForm({ ...form, title: e.target.value })}
                     required
                     style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                   />
                 </div>

                 <div style={{ flex: 2 }}>
                   <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Link URL</label>
                   <input
                     type="url"
                     value={form.link}
                     onChange={e => setForm({ ...form, link: e.target.value })}
                     placeholder="https://example.com"
                     style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                   />
                 </div>

                 <div style={{ flex: 1 }}>
                   <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Order</label>
                   <input
                     type="text"
                     inputMode="numeric"
                     value={form.order}
                     onChange={e => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                     style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                   />
                 </div>
               </div>

               <div style={{ marginBottom: 20 }}>
                 <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Ad Image</label>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                   {previewUrl && (
                     <div style={{ width: 120, height: 60, borderRadius: 8, overflow: 'hidden', background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                       <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                     </div>
                   )}
                   <label style={{
                     display: 'inline-block', padding: '8px 16px', background: 'var(--bg-tertiary)',
                     border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
                     cursor: 'pointer', fontSize: 13, fontWeight: 600
                   }}>
                     Choose Image
                     <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                   </label>
                 </div>
                 {!editingAd && !imageFile && (
                   <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Recommended size: 1200x600px or 2:1 ratio</p>
                 )}
               </div>

               <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                 <button type="button" onClick={() => setShowModal(false)} style={{
                   padding: '10px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                   background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', fontSize: 14
                 }}>
                   Cancel
                 </button>
                 <button type="submit" disabled={uploading} style={{
                   padding: '10px 24px', borderRadius: 'var(--radius-md)', border: 'none',
                   background: uploading ? 'var(--bg-tertiary)' : 'var(--accent-gradient)',
                   color: '#fff', fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer', fontSize: 14
                 }}>
                   {uploading ? 'Saving...' : (editingAd ? 'Update Ad' : 'Create Ad')}
                 </button>
               </div>
             </form>
           </div>
         </div>
       )}
    </div>
  )
}
