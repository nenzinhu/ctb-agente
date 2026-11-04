'use client';
import {useEffect,useState} from 'react';
import {ABAS_PADRAO,ordenarAbas,validarAbas} from '@/lib/navigation';
const KEY='ctb-abas-preferidas-v1',EVENT='ctb-abas-atualizadas';
export function lerAbas(){try{const v=JSON.parse(localStorage.getItem(KEY)??'null');return validarAbas(v)?v:ABAS_PADRAO}catch{return ABAS_PADRAO}}
export function salvarAbas(v:string[]){if(!validarAbas(v))return false;try{localStorage.setItem(KEY,JSON.stringify(v));window.dispatchEvent(new Event(EVENT));return true}catch{return false}}
export function useAbas(){const [preferidas,setPreferidas]=useState(ABAS_PADRAO);useEffect(()=>{const atualizar=()=>setPreferidas(lerAbas());atualizar();window.addEventListener(EVENT,atualizar);window.addEventListener('storage',atualizar);return()=>{window.removeEventListener(EVENT,atualizar);window.removeEventListener('storage',atualizar)}},[]);return {preferidas,abas:ordenarAbas(preferidas)}}
