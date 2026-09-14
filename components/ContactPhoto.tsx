'use client'
import {useState} from 'react'
export default function ContactPhoto({url,initials,name}:{url?:string|null;initials:string;name:string}) {
 const [failed,setFailed]=useState<string|null>(null)
 return url?.startsWith('https://')&&failed!==url
  ? <img src={url} alt={name} className="w-full h-full object-cover rounded-[inherit]" referrerPolicy="no-referrer" onError={()=>setFailed(url)} />
  : <>{initials}</>
}
