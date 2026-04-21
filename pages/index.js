import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Head from 'next/head'

export default function Home() {
  const [branches, setBranches] = useState([])
  const [rooms, setRooms] = useState([])
  const [bookings, setBookings] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('calendar')
  const [curBranchId, setCurBranchId] = useState(null)
  const [selectedDate, setSelectedDate] = useState(today())
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [curUser, setCurUser] = useState({ id: 'demo', name: 'Jihwan Kim', team: 'Project Team', role: 'admin' })
  const [sheet, setSheet] = useState(null)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({})

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [b, r, bk, m] = await Promise.all([
      supabase.from('branches').select('*').order('created_at'),
      supabase.from('rooms').select('*').order('created_at'),
      supabase.from('bookings').select('*').order('date'),
      supabase.from('members').select('*').order('created_at'),
    ])
    setBranches(b.data || [])
    setRooms(r.data || [])
    setBookings(bk.data || [])
    setMembers(m.data || [])
    if (b.data && b.data.length > 0) setCurBranchId(b.data[0].id)
    setLoading(false)
  }

  function today() { return new Date().toISOString().slice(0, 10) }

  function fmtDate(s) {
    const d = new Date(s + 'T00:00:00')
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return `${months[d.getMonth()]} ${d.getDate()} (${days[d.getDay()]})`
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const branchRooms = rooms.filter(r => r.branch_id === curBranchId)

  async function confirmBook() {
    const { roomId, date, startHour, endHour, desc } = form
    if (!roomId || !date || !startHour || !endHour) { showToast('Please fill in all fields'); return }
    if (endHour <= startHour) { showToast('End time must be after start time'); return }
    const conflict = bookings.find(b =>
      b.room_id === roomId && b.date === date &&
      !(b.end_hour <= startHour || b.start_hour >= endHour)
    )
    if (conflict) { showToast('This time slot is already booked'); return }
    const { data, error } = await supabase.from('bookings').insert([{
      room_id: roomId,
      member_id: curUser.id === 'demo' ? null : curUser.id,
      date,
      start_hour: startHour,
      end_hour: endHour,
      description: desc || 'Meeting',
      booker_name: curUser.name,
      booker_team: curUser.team,
    }]).select()
    if (error) { showToast('Booking failed: ' + error.message); return }
    setBookings(prev => [...prev, data[0]])
    setSheet(null)
    const room = rooms.find(r => r.id === roomId)
    showToast(`Booked: ${room?.name} ${startHour}:00 - ${endHour}:00`)
  }

  async function doCancel(bookingId) {
    const { error } = await supabase.from('bookings').delete().eq('id', bookingId)
    if (error) { showToast('Cancellation failed'); return }
    setBookings(prev => prev.filter(b => b.id !== bookingId))
    setSheet(null)
    showToast('Booking cancelled')
  }

  async function confirmAddBranch() {
    const { branchName, branchEmoji } = form
    if (!branchName) { showToast('Please enter a branch name'); return }
    const { data, error } = await supabase.from('branches').insert([{ name: branchName, emoji: branchEmoji || '🏢' }]).select()
    if (error) { showToast('Failed to add branch'); return }
    setBranches(prev => [...prev, data[0]])
    setSheet(null)
    showToast(`Branch "${branchName}" added!`)
  }

  async function deleteBranch(id) {
    if (!confirm('Deleting this branch will also remove all its rooms. Continue?')) return
    const { error } = await supabase.from('branches').delete().eq('id', id)
    if (error) { showToast('Delete failed'); return }
    setBranches(prev => prev.filter(b => b.id !== id))
    setRooms(prev => prev.filter(r => r.branch_id !== id))
    showToast('Branch deleted')
  }

  async function confirmAddRoom() {
    const { roomBranchId, roomName, roomCap, roomColor } = form
    if (!roomBranchId || !roomName) { showToast('Please select a branch and enter a room name'); return }
    const { data, error } = await supabase.from('rooms').insert([{
      branch_id: roomBranchId,
      name: roomName,
      capacity: roomCap || 8,
      color: roomColor || '#DBEAFE'
    }]).select()
    if (error) { showToast('Failed to add room'); return }
    setRooms(prev => [...prev, data[0]])
    setSheet(null)
    const branch = branches.find(b => b.id === roomBranchId)
    showToast(`Room "${roomName}" added to ${branch?.name}!`)
  }

  async function deleteRoom(id) {
    if (!confirm('Delete this room?')) return
    const { error } = await supabase.from('rooms').delete().eq('id', id)
    if (error) { showToast('Delete failed'); return }
    setRooms(prev => prev.filter(r => r.id !== id))
    showToast('Room deleted')
  }

  async function confirmAddMember() {
    const { memberName, memberTeam, memberRole } = form
    if (!memberName) { showToast('Please enter a name'); return }
    const { data, error } = await supabase.from('members').insert([{
      name: memberName,
      team: memberTeam || 'Unassigned',
      role: memberRole || 'member',
      status: 'pending'
    }]).select()
    if (error) { showToast('Failed to add member'); return }
    setMembers(prev => [...prev, data[0]])
    setSheet(null)
    showToast(`${memberName} has been added`)
  }

  async function approveMember(id) {
    const { error } = await supabase.from('members').update({ status: 'active' }).eq('id', id)
    if (error) { showToast('Failed'); return }
    setMembers(prev => prev.map(m => m.id === id ? { ...m, status: 'active' } : m))
    showToast('Member approved')
  }

  async function removeMember(id) {
    const { error } = await supabase.from('members').delete().eq('id', id)
    if (error) { showToast('Failed'); return }
    setMembers(prev => prev.filter(m => m.id !== id))
    showToast('Member removed')
  }

  function renderCalendar() {
    const first = new Date(calYear, calMonth, 1)
    const last = new Date(calYear, calMonth + 1, 0)
    const startDow = first.getDay()
    const prevLast = new Date(calYear, calMonth, 0).getDate()
    const cells = []
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(calYear, calMonth - 1, prevLast - i)
      cells.push({ date: d.toISOString().slice(0, 10), other: true, d: prevLast - i })
    }
    for (let d = 1; d <= last.getDate(); d++) {
      const ds = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({ date: ds, other: false, d })
    }
    const total = startDow + last.getDate()
    const remain = total % 7 === 0 ? 0 : 7 - (total % 7)
    for (let d = 1; d <= remain; d++) {
      const nd = new Date(calYear, calMonth + 1, d)
      cells.push({ date: nd.toISOString().slice(0, 10), other: true, d })
    }
    return cells
  }

  function getDayBookings(ds) {
    return bookings.filter(b => b.date === ds && branchRooms.some(r => r.id === b.room_id))
  }

  function renderTimeline(ds) {
    const rows = []
    for (let h = 8; h <= 18; h++) {
      branchRooms.forEach(room => {
        const b = bookings.find(bk => bk.room_id === room.id && bk.date === ds && bk.start_hour <= h && bk.end_hour > h)
        if (b && b.start_hour !== h) return
        rows.push({ hour: h, room, booking: b || null })
      })
    }
    return rows
  }

  const calCells = renderCalendar()
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:32 }}>🏢</div>
      <div style={{ fontSize:14, color:'#64748b' }}>Loading...</div>
    </div>
  )

  return (
    <>
      <Head>
        <title>MeetingHub</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:-apple-system,'Segoe UI',sans-serif;background:#f8fafc;color:#1e293b;font-size:14px;}
        .nav{background:white;border-bottom:1px solid #e2e8f0;padding:12px 16px;display:flex;align-items:center;gap:10px;position:sticky;top:0;z-index:100;}
        .tabs{display:flex;background:white;border-bottom:1px solid #e2e8f0;}
        .tab{flex:1;padding:11px;text-align:center;font-size:12px;font-weight:500;cursor:pointer;color:#64748b;border-bottom:2px solid transparent;}
        .tab.active{color:#2563EB;border-bottom-color:#2563EB;font-weight:600;}
        .main{padding:14px;max-width:700px;margin:0 auto;}
        .card{background:white;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;margin-bottom:14px;}
        .card-hdr{padding:12px 16px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;}
        .card-hdr-title{font-size:14px;font-weight:600;}
        .sel{width:100%;padding:9px 12px;border-radius:8px;border:1px solid #cbd5e1;background:white;color:#1e293b;font-size:13px;font-family:inherit;outline:none;}
        .inp{width:100%;padding:9px 12px;border-radius:8px;border:1px solid #cbd5e1;background:white;color:#1e293b;font-size:13px;font-family:inherit;outline:none;}
        .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);}
        .cal-dow{text-align:center;padding:8px 0;font-size:11px;font-weight:600;color:#94a3b8;background:#f8fafc;}
        .cal-day{min-height:62px;padding:4px;border-right:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;cursor:pointer;}
        .cal-day:hover{background:#f8fafc;}
        .cal-day.sel{background:#EFF6FF;}
        .slot-empty{background:#f8fafc;border:1px dashed #cbd5e1;color:#94a3b8;cursor:pointer;}
        .slot-empty:hover{background:#EFF6FF;border-color:#93C5FD;color:#2563EB;}
        .btn{padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;border:none;cursor:pointer;font-family:inherit;}
        .btn-blue{background:#2563EB;color:white;}
        .btn-red{background:#EF4444;color:white;}
        .btn-out{background:transparent;border:1px solid #cbd5e1;color:#475569;}
        .btn-sm{padding:5px 10px;font-size:11px;border-radius:6px;}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:flex-end;justify-content:center;}
        .sheet{background:white;border-radius:20px 20px 0 0;width:100%;max-width:700px;padding:20px;max-height:90vh;overflow-y:auto;}
        .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1e293b;color:white;padding:10px 18px;border-radius:10px;font-size:13px;z-index:999;white-space:nowrap;}
        .badge{display:inline-flex;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;}
        .b-admin{background:#EDE9FE;color:#7C3AED;}
        .b-member{background:#DBEAFE;color:#1D4ED8;}
        .b-pending{background:#FEF3C7;color:#92400E;}
        .lbl{font-size:11px;color:#64748b;margin-bottom:4px;display:block;}
        .row{display:flex;gap:8px;margin-bottom:10px;}
        .item{padding:12px 16px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:10px;}
        .item:last-child{border-bottom:none;}
      `}</style>

      <div className="nav">
        <div style={{fontSize:15,fontWeight:700,color:'#2563EB',flex:1}}>🏢 MeetingHub</div>
        <button className="btn btn-out btn-sm">👤 {curUser.name}</button>
      </div>

      <div className="tabs">
        {[['calendar','📅 Calendar'],['timeline','⏱ Timeline'],['mine','📋 My Bookings'],['admin','⚙️ Admin']].map(([id,label])=>(
          <div key={id} className={`tab${activeTab===id?' active':''}`} onClick={()=>setActiveTab(id)}>{label}</div>
        ))}
      </div>

      <div className="main">
        {activeTab !== 'admin' && (
          <div style={{marginBottom:14}}>
            <label className="lbl">📍 Select Branch</label>
            <select className="sel" value={curBranchId||''} onChange={e=>setCurBranchId(e.target.value)}>
              {branches.map(b=><option key={b.id} value={b.id}>{b.emoji} {b.name}</option>)}
            </select>
          </div>
        )}

        {/* CALENDAR */}
        {activeTab==='calendar'&&(
          <>
            <div className="card">
              <div className="card-hdr">
                <button className="btn btn-out btn-sm" onClick={()=>{setCalMonth(m=>{if(m===0){setCalYear(y=>y-1);return 11}return m-1})}}>◀</button>
                <div style={{fontWeight:700,fontSize:15}}>{monthNames[calMonth]} {calYear}</div>
                <button className="btn btn-out btn-sm" onClick={()=>{const n=new Date();setCalYear(n.getFullYear());setCalMonth(n.getMonth())}}>Today</button>
                <button className="btn btn-out btn-sm" onClick={()=>{setCalMonth(m=>{if(m===11){setCalYear(y=>y+1);return 0}return m+1})}}>▶</button>
              </div>
              <div className="cal-grid">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>(
                  <div key={d} className="cal-dow" style={{color:d==='Sun'?'#EF4444':d==='Sat'?'#3B82F6':undefined}}>{d}</div>
                ))}
                {calCells.map((cell,i)=>{
                  const dayB=getDayBookings(cell.date)
                  const isToday=cell.date===today()
                  const isSel=cell.date===selectedDate
                  const dow=new Date(cell.date+'T00:00:00').getDay()
                  return(
                    <div key={i} className={`cal-day${isSel?' sel':''}`} onClick={()=>setSelectedDate(cell.date)} style={{opacity:cell.other?0.4:1}}>
                      <div style={{fontSize:12,fontWeight:500,width:22,height:22,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:2,background:isToday?'#2563EB':undefined,color:isToday?'white':dow===0?'#EF4444':dow===6?'#3B82F6':undefined,borderRadius:isToday?'50%':undefined}}>{cell.d}</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:2}}>
                        {dayB.slice(0,4).map((b,j)=>(
                          <div key={j} style={{height:5,borderRadius:2,background:b.booker_name===curUser.name?'#2563EB':'#BFDBFE',width:`calc(${100/Math.min(dayB.length+1,5)}% - 2px)`}}/>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            {selectedDate&&(
              <div className="card">
                <div className="card-hdr">
                  <div className="card-hdr-title">{fmtDate(selectedDate)} — Bookings</div>
                  <button className="btn btn-blue btn-sm" onClick={()=>{setForm({date:selectedDate,roomId:branchRooms[0]?.id});setSheet('book')}}>+ Book</button>
                </div>
                <div style={{padding:'12px 16px'}}>
                  {renderTimeline(selectedDate).length===0
                    ?<div style={{textAlign:'center',color:'#94a3b8',padding:20,fontSize:13}}>No bookings</div>
                    :renderTimeline(selectedDate).map((row,i)=>(
                      <div key={i} style={{display:'flex',gap:10,marginBottom:2,minHeight:34}}>
                        <div style={{fontSize:11,color:'#94a3b8',width:38,textAlign:'right',paddingTop:8,flexShrink:0}}>{row.hour}:00</div>
                        {row.booking?(
                          <div style={{flex:1,minHeight:32,borderRadius:6,padding:'0 10px',display:'flex',alignItems:'center',justifyContent:'space-between',background:row.room.color,outline:row.booking.booker_name===curUser.name?'2px solid #2563EB':undefined}}>
                            <div>
                              <div style={{fontWeight:600,fontSize:12}}>[{row.room.name}] {row.booking.booker_team}{row.booking.booker_name===curUser.name?' ★':''}</div>
                              <div style={{fontSize:10,opacity:.75}}>{row.booking.description}</div>
                            </div>
                            <div style={{display:'flex',alignItems:'center',gap:6}}>
                              <span style={{fontSize:10,opacity:.6}}>{row.booking.start_hour}–{row.booking.end_hour}</span>
                              {row.booking.booker_name===curUser.name&&(
                                <button onClick={()=>{setForm({cancelId:row.booking.id,cancelInfo:`${row.room.name} ${row.booking.start_hour}:00–${row.booking.end_hour}:00`});setSheet('cancel')}} style={{padding:'3px 8px',borderRadius:5,border:'none',background:'#EF4444',color:'white',fontSize:10,cursor:'pointer'}}>Cancel</button>
                              )}
                            </div>
                          </div>
                        ):(
                          <div className="slot-empty" style={{flex:1,minHeight:32,borderRadius:6,padding:'0 10px',display:'flex',alignItems:'center',fontSize:12}}
                            onClick={()=>{setForm({date:selectedDate,roomId:row.room.id,startHour:row.hour,endHour:Math.min(row.hour+1,18)});setSheet('book')}}>
                            [{row.room.name}] + Book this slot
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* TIMELINE */}
        {activeTab==='timeline'&&(
          <div className="card">
            <div className="card-hdr">
              <div className="card-hdr-title">Today — {fmtDate(today())}</div>
              <button className="btn btn-blue btn-sm" onClick={()=>{setForm({date:today(),roomId:branchRooms[0]?.id});setSheet('book')}}>+ Book</button>
            </div>
            <div style={{padding:'12px 16px'}}>
              {renderTimeline(today()).map((row,i)=>(
                <div key={i} style={{display:'flex',gap:10,marginBottom:2,minHeight:34}}>
                  <div style={{fontSize:11,color:'#94a3b8',width:38,textAlign:'right',paddingTop:8,flexShrink:0}}>{row.hour}:00</div>
                  {row.booking?(
                    <div style={{flex:1,minHeight:32,borderRadius:6,padding:'0 10px',display:'flex',alignItems:'center',justifyContent:'space-between',background:row.room.color,outline:row.booking.booker_name===curUser.name?'2px solid #2563EB':undefined}}>
                      <div>
                        <div style={{fontWeight:600,fontSize:12}}>[{row.room.name}] {row.booking.booker_team}{row.booking.booker_name===curUser.name?' ★':''}</div>
                        <div style={{fontSize:10,opacity:.75}}>{row.booking.description}</div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <span style={{fontSize:10,opacity:.6}}>{row.booking.start_hour}–{row.booking.end_hour}</span>
                        {row.booking.booker_name===curUser.name&&(
                          <button onClick={()=>{setForm({cancelId:row.booking.id,cancelInfo:`${row.room.name} ${row.booking.start_hour}:00–${row.booking.end_hour}:00`});setSheet('cancel')}} style={{padding:'3px 8px',borderRadius:5,border:'none',background:'#EF4444',color:'white',fontSize:10,cursor:'pointer'}}>Cancel</button>
                        )}
                      </div>
                    </div>
                  ):(
                    <div className="slot-empty" style={{flex:1,minHeight:32,borderRadius:6,padding:'0 10px',display:'flex',alignItems:'center',fontSize:12}}
                      onClick={()=>{setForm({date:today(),roomId:row.room.id,startHour:row.hour,endHour:Math.min(row.hour+1,18)});setSheet('book')}}>
                      [{row.room.name}] + Book this slot
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MY BOOKINGS */}
        {activeTab==='mine'&&(
          <div className="card">
            <div className="card-hdr"><div className="card-hdr-title">My Bookings</div></div>
            {bookings.filter(b=>b.booker_name===curUser.name).length===0
              ?<div style={{padding:24,textAlign:'center',color:'#94a3b8',fontSize:13}}>No bookings found</div>
              :bookings.filter(b=>b.booker_name===curUser.name).sort((a,b)=>a.date.localeCompare(b.date)).map(b=>{
                const room=rooms.find(r=>r.id===b.room_id)
                const branch=room?branches.find(br=>br.id===room.branch_id):null
                const isPast=b.date<today()
                return(
                  <div key={b.id} className="item" style={{opacity:isPast?.5:1}}>
                    <div style={{width:36,height:36,borderRadius:10,background:room?.color||'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{branch?.emoji||'📅'}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:13}}>{room?.name} · {branch?.name}</div>
                      <div style={{fontSize:11,color:'#64748b'}}>{fmtDate(b.date)} {b.start_hour}:00–{b.end_hour}:00</div>
                      <div style={{fontSize:11,color:'#64748b'}}>{b.description}</div>
                    </div>
                    {!isPast&&<button className="btn btn-out btn-sm" style={{color:'#EF4444',borderColor:'#FCA5A5'}} onClick={()=>{setForm({cancelId:b.id,cancelInfo:`${room?.name} ${b.start_hour}:00–${b.end_hour}:00`});setSheet('cancel')}}>Cancel</button>}
                    {isPast&&<span style={{fontSize:11,color:'#94a3b8'}}>Done</span>}
                  </div>
                )
              })}
          </div>
        )}

        {/* ADMIN */}
        {activeTab==='admin'&&(
          <>
            <div className="card">
              <div className="card-hdr">
                <div className="card-hdr-title">Branch Management</div>
                <button className="btn btn-blue btn-sm" onClick={()=>{setForm({});setSheet('addBranch')}}>+ Add Branch</button>
              </div>
              {branches.length===0?<div style={{padding:16,textAlign:'center',color:'#94a3b8',fontSize:13}}>No branches yet</div>
                :branches.map(b=>(
                  <div key={b.id} className="item">
                    <div style={{width:36,height:36,borderRadius:10,background:'#EFF6FF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{b.emoji}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:13}}>{b.name}</div>
                      <div style={{fontSize:11,color:'#64748b'}}>{rooms.filter(r=>r.branch_id===b.id).length} room(s)</div>
                    </div>
                    <button className="btn btn-out btn-sm" style={{color:'#EF4444',borderColor:'#FCA5A5'}} onClick={()=>deleteBranch(b.id)}>Delete</button>
                  </div>
                ))}
            </div>

            <div className="card">
              <div className="card-hdr">
                <div className="card-hdr-title">Room Management</div>
                <button className="btn btn-blue btn-sm" onClick={()=>{setForm({roomBranchId:branches[0]?.id});setSheet('addRoom')}}>+ Add Room</button>
              </div>
              {rooms.length===0?<div style={{padding:16,textAlign:'center',color:'#94a3b8',fontSize:13}}>No rooms yet</div>
                :rooms.map(r=>{
                  const branch=branches.find(b=>b.id===r.branch_id)
                  return(
                    <div key={r.id} className="item">
                      <div style={{width:36,height:36,borderRadius:10,background:r.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>🚪</div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600,fontSize:13}}>{r.name}</div>
                        <div style={{fontSize:11,color:'#64748b'}}>{branch?.emoji} {branch?.name} · Max {r.capacity} ppl</div>
                      </div>
                      <button className="btn btn-out btn-sm" style={{color:'#EF4444',borderColor:'#FCA5A5'}} onClick={()=>deleteRoom(r.id)}>Delete</button>
                    </div>
                  )
                })}
            </div>

            <div className="card">
              <div className="card-hdr">
                <div className="card-hdr-title">Member Management</div>
                <button className="btn btn-blue btn-sm" onClick={()=>{setForm({});setSheet('addMember')}}>+ Add Member</button>
              </div>
              {members.length===0?<div style={{padding:16,textAlign:'center',color:'#94a3b8',fontSize:13}}>No members yet</div>
                :members.map(m=>{
                  const bc=m.role==='admin'?'b-admin':m.status==='pending'?'b-pending':'b-member'
                  const bt=m.role==='admin'?'Admin':m.status==='pending'?'Pending':'Member'
                  return(
                    <div key={m.id} className="item">
                      <div style={{width:36,height:36,borderRadius:10,background:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>👤</div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600,fontSize:13}}>{m.name} <span className={`badge ${bc}`}>{bt}</span></div>
                        <div style={{fontSize:11,color:'#64748b'}}>{m.team}</div>
                      </div>
                      <div style={{display:'flex',gap:6}}>
                        {m.status==='pending'&&<button className="btn btn-out btn-sm" style={{color:'#2563EB',borderColor:'#93C5FD'}} onClick={()=>approveMember(m.id)}>Approve</button>}
                        {m.role!=='admin'&&<button className="btn btn-out btn-sm" style={{color:'#EF4444',borderColor:'#FCA5A5'}} onClick={()=>removeMember(m.id)}>Remove</button>}
                      </div>
                    </div>
                  )
                })}
            </div>
          </>
        )}
      </div>

      {sheet&&(
        <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)setSheet(null)}}>
          <div className="sheet">
            <div style={{width:36,height:4,background:'#cbd5e1',borderRadius:2,margin:'0 auto 16px'}}/>

            {sheet==='book'&&(<>
              <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>Book a Meeting Room</div>
              <div style={{fontSize:12,color:'#64748b',marginBottom:16}}>Select branch, room, date and time</div>
              <div className="row">
                <div style={{flex:1}}><label className="lbl">Branch</label>
                  <select className="sel" value={form.branchId||curBranchId||''} onChange={e=>{
                    const newBranchId=e.target.value
                    const firstRoom=rooms.find(r=>r.branch_id===newBranchId)
                    setForm(f=>({...f,branchId:newBranchId,roomId:firstRoom?.id||''}))
                  }}>
                    {branches.map(b=><option key={b.id} value={b.id}>{b.emoji} {b.name}</option>)}
                  </select>
                </div>
                <div style={{flex:1}}><label className="lbl">Room</label>
                  <select className="sel" value={form.roomId||rooms.find(r=>r.branch_id===(form.branchId||curBranchId))?.id||''} onChange={e=>setForm(f=>({...f,roomId:e.target.value}))}>
                    {rooms.filter(r=>r.branch_id===(form.branchId||curBranchId)).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{marginBottom:10}}><label className="lbl">Date</label>
                <input className="inp" type="date" value={form.date||today()} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
              </div>
              <div className="row">
                <div style={{flex:1}}><label className="lbl">Start</label>
                  <select className="sel" value={form.startHour||9} onChange={e=>setForm(f=>({...f,startHour:parseInt(e.target.value)}))}>
                    {Array.from({length:11},(_,i)=>i+8).map(h=><option key={h} value={h}>{h}:00</option>)}
                  </select>
                </div>
                <div style={{flex:1}}><label className="lbl">End</label>
                  <select className="sel" value={form.endHour||10} onChange={e=>setForm(f=>({...f,endHour:parseInt(e.target.value)}))}>
                    {Array.from({length:10},(_,i)=>i+9).map(h=><option key={h} value={h}>{h}:00</option>)}
                  </select>
                </div>
              </div>
              <div style={{marginBottom:10}}><label className="lbl">Meeting Title</label>
                <input className="inp" placeholder="e.g. LA Factory Progress Report" value={form.desc||''} onChange={e=>setForm(f=>({...f,desc:e.target.value}))}/>
              </div>
              <div style={{display:'flex',gap:8,marginTop:16}}>
                <button className="btn btn-out" style={{flex:1}} onClick={()=>setSheet(null)}>Cancel</button>
                <button className="btn btn-blue" style={{flex:2}} onClick={confirmBook}>Confirm Booking</button>
              </div>
            </>)}

            {sheet==='cancel'&&(<>
              <div style={{fontSize:16,fontWeight:700,marginBottom:12}}>Cancel Booking</div>
              <div style={{fontSize:13,color:'#64748b',background:'#f8fafc',borderRadius:8,padding:12,marginBottom:16}}>{form.cancelInfo}</div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn btn-out" style={{flex:1}} onClick={()=>setSheet(null)}>Go Back</button>
                <button className="btn btn-red" style={{flex:1}} onClick={()=>doCancel(form.cancelId)}>Confirm Cancel</button>
              </div>
            </>)}

            {sheet==='addBranch'&&(<>
              <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>Add Branch</div>
              <div style={{fontSize:12,color:'#64748b',marginBottom:16}}>Add a new branch location</div>
              <div style={{marginBottom:10}}><label className="lbl">Branch Name *</label>
                <input className="inp" placeholder="e.g. Irvine Office, Downtown LA" value={form.branchName||''} onChange={e=>setForm(f=>({...f,branchName:e.target.value}))}/>
              </div>
              <div style={{marginBottom:10}}><label className="lbl">Icon</label>
                <select className="sel" value={form.branchEmoji||'🏢'} onChange={e=>setForm(f=>({...f,branchEmoji:e.target.value}))}>
                  {[['🏭','Factory'],['🏢','Office'],['🏬','Commercial'],['🏗️','Construction'],['🏛️','HQ'],['🌎','Overseas']].map(([v,l])=><option key={v} value={v}>{v} {l}</option>)}
                </select>
              </div>
              <div style={{display:'flex',gap:8,marginTop:16}}>
                <button className="btn btn-out" style={{flex:1}} onClick={()=>setSheet(null)}>Cancel</button>
                <button className="btn btn-blue" style={{flex:2}} onClick={confirmAddBranch}>Add Branch</button>
              </div>
            </>)}

            {sheet==='addRoom'&&(<>
              <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>Add Meeting Room</div>
              <div style={{fontSize:12,color:'#64748b',marginBottom:16}}>Select the branch first, then enter room details</div>
              <div style={{marginBottom:10}}><label className="lbl">Select Branch *</label>
                <select className="sel" value={form.roomBranchId||''} onChange={e=>setForm(f=>({...f,roomBranchId:e.target.value}))}>
                  {branches.map(b=><option key={b.id} value={b.id}>{b.emoji} {b.name}</option>)}
                </select>
              </div>
              <div style={{marginBottom:10}}><label className="lbl">Room Name *</label>
                <input className="inp" placeholder="e.g. Conference Room A, Small Room 1" value={form.roomName||''} onChange={e=>setForm(f=>({...f,roomName:e.target.value}))}/>
              </div>
              <div className="row">
                <div style={{flex:1}}><label className="lbl">Max Capacity</label>
                  <select className="sel" value={form.roomCap||8} onChange={e=>setForm(f=>({...f,roomCap:parseInt(e.target.value)}))}>
                    {[4,6,8,10,12,20].map(n=><option key={n} value={n}>{n} people</option>)}
                  </select>
                </div>
                <div style={{flex:1}}><label className="lbl">Color</label>
                  <select className="sel" value={form.roomColor||'#DBEAFE'} onChange={e=>setForm(f=>({...f,roomColor:e.target.value}))}>
                    {[['#DBEAFE','Blue'],['#D1FAE5','Green'],['#FEF3C7','Yellow'],['#EDE9FE','Purple'],['#FCE7F3','Pink'],['#FFEDD5','Orange']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div style={{display:'flex',gap:8,marginTop:16}}>
                <button className="btn btn-out" style={{flex:1}} onClick={()=>setSheet(null)}>Cancel</button>
                <button className="btn btn-blue" style={{flex:2}} onClick={confirmAddRoom}>Add Room</button>
              </div>
            </>)}

            {sheet==='addMember'&&(<>
              <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>Add Member</div>
              <div style={{fontSize:12,color:'#64748b',marginBottom:16}}>Add a new member to the system</div>
              <div className="row">
                <div style={{flex:1}}><label className="lbl">Name *</label>
                  <input className="inp" placeholder="John Doe" value={form.memberName||''} onChange={e=>setForm(f=>({...f,memberName:e.target.value}))}/>
                </div>
                <div style={{flex:1}}><label className="lbl">Team</label>
                  <input className="inp" placeholder="Dev Team" value={form.memberTeam||''} onChange={e=>setForm(f=>({...f,memberTeam:e.target.value}))}/>
                </div>
              </div>
              <div style={{marginBottom:10}}><label className="lbl">Role</label>
                <select className="sel" value={form.memberRole||'member'} onChange={e=>setForm(f=>({...f,memberRole:e.target.value}))}>
                  <option value="member">Member (booking only)</option>
                  <option value="admin">Admin (can manage branches & rooms)</option>
                </select>
              </div>
              <div style={{display:'flex',gap:8,marginTop:16}}>
                <button className="btn btn-out" style={{flex:1}} onClick={()=>setSheet(null)}>Cancel</button>
                <button className="btn btn-blue" style={{flex:2}} onClick={confirmAddMember}>Add Member</button>
              </div>
            </>)}
          </div>
        </div>
      )}

      {toast&&<div className="toast">{toast}</div>}
    </>
  )
}
