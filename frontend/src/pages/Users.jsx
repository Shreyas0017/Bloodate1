import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Users(){
  const [users, setUsers] = useState([])
  const { token, role } = useAuth()
  useEffect(()=>{ load() },[])
  const load = async ()=>{
    try {
      const list = await import('../api').then(m=>m.listUsers(token))
      setUsers(list || [])
    } catch (e) { console.error(e) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Users</h2>
        <p className="text-sm text-slate-500">Admin-only view of all users.</p>
      </div>
      {role !== 'SUPER_ADMIN' ? (
        <div className="text-sm text-slate-500">Only super admins can view this page. Sign in from the login page.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {users.length===0 ? <div className="text-sm text-slate-500">No users</div> : (
            users.map(u=> (
              <div key={u.id} className="panel p-4">
                <div className="text-sm font-semibold">{u.name || u.email}</div>
                <div className="text-xs text-slate-500 mt-1">Role: {u.role}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
