import React, { useEffect, useState } from 'react'
import { uploadFile } from '../api'
import { useAuth } from '../context/AuthContext'

const formatDate = (s) => { try { return new Date(s).toLocaleString() } catch(e){ return s } }

export default function Uploads(){
  const { token, role } = useAuth()
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [uploads, setUploads] = useState([])

  const doUpload = async (e) => {
    e.preventDefault()
    if (!file) return alert('pick a file')
    try {
      const res = await uploadFile(file, token)
      setResult(res)
    } catch (err) { console.error(err); alert('upload failed') }
  }

  useEffect(()=>{ if (token && role === 'HOSPITAL_ADMIN') loadList() },[token, role])
  const loadList = async ()=>{
    try {
      const list = await import('../api').then(m=>m.listUploads(token))
      setUploads(list || [])
    } catch (e) { console.error(e) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Uploads</h2>
          <p className="text-sm text-slate-500">Upload and review recent proofs and documents.</p>
        </div>
        <span className="text-xs text-slate-500">Total: {uploads.length}</span>
      </div>

      <div className="panel p-6">
        {!token ? (
          <div className="text-sm text-slate-500">Login as hospital admin to upload files.</div>
        ) : (
          <form onSubmit={doUpload} className="flex flex-col md:flex-row md:items-center gap-3">
            <input type="file" accept="image/*" onChange={e=>setFile(e.target.files[0])} className="block w-full text-sm" />
            <button className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700" type="submit">Upload</button>
          </form>
        )}
        {result && (
          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">
            <div className="text-slate-600">URL:</div>
            <a className="text-red-600 break-all" href={result.cloud && result.cloud.secure_url ? result.cloud.secure_url : result.record && result.record.url} target="_blank" rel="noreferrer">{result.cloud && result.cloud.secure_url ? result.cloud.secure_url : result.record && result.record.url}</a>
          </div>
        )}
      </div>

      <div className="grid gap-4">
        {role !== 'HOSPITAL_ADMIN' ? (
          <div className="text-sm text-slate-500">Uploads list is visible to hospital admins only.</div>
        ) : uploads.length===0 ? (
          <div className="text-sm text-slate-500">No uploads</div>
        ) : (
          uploads.map(u=> (
            <div key={u.id} className="panel p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold"><a className="text-red-600" href={u.url} target="_blank" rel="noreferrer">{u.originalName || u.filename}</a></div>
                  <div className="text-xs text-slate-500">Uploader: {u.uploaderId || '—'} • {formatDate(u.createdAt)}</div>
                </div>
                <span className="text-[10px] px-2 py-1 rounded-full bg-slate-100 text-slate-600">{u.bytes || '—'} bytes</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
