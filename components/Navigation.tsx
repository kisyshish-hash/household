'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, ClipboardList, CalendarDays, Gift, PartyPopper, Palette, LogOut } from 'lucide-react'
import { useTheme, type Theme } from './ThemeProvider'
import { useAuth } from './AuthProvider'
import { useState } from 'react'

const navItems = [
  { href: '/', label: '대시보드', Icon: LayoutDashboard },
  { href: '/calendar', label: '달력', Icon: CalendarDays },
  { href: '/routines', label: '루틴', Icon: ClipboardList },
  { href: '/events', label: '경조사', Icon: PartyPopper },
  { href: '/gifts', label: '선물', Icon: Gift },
  { href: '/family', label: '가족', Icon: Users },
]

const THEMES: { value: Theme; label: string; color: string }[] = [
  { value: 'default', label: '기본', color: 'bg-[#fbbf24]' },
  { value: 'starbucks', label: '스타벅스', color: 'bg-[#00704a]' },
  { value: 'apple', label: '애플', color: 'bg-[#0071e3]' },
]

export default function Navigation() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { user, member, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* 상단 헤더 (데스크탑) */}
      <header className="hidden md:flex items-center bg-white border-b border-amber-100 px-6 h-14 gap-1 shadow-sm">
        <span className="font-bold text-amber-600 text-lg mr-6">홈 오퍼레이션</span>
        {navItems.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === href
                ? 'bg-amber-50 text-amber-700'
                : 'text-gray-500 hover:text-amber-600 hover:bg-amber-50'
            }`}
          >
            <Icon size={15} />
            <span>{label}</span>
          </Link>
        ))}

        {/* 테마 선택 (데스크탑) */}
        <div className="ml-auto flex items-center gap-2">
          {user && (
            <span className="text-xs text-gray-400">
              {member?.name ?? user.email}
            </span>
          )}
          {user && (
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-amber-50 hover:text-amber-600"
            >
              <LogOut size={15} />
              <span>로그아웃</span>
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
            >
              <Palette size={15} />
              <span>테마</span>
            </button>
            {open && (
              <div className="absolute right-0 top-10 bg-white border rounded-xl shadow-lg p-2 z-50 min-w-[130px]">
                {THEMES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => { setTheme(t.value); setOpen(false) }}
                    className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                      theme === t.value ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${t.color}`} />
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {user && (
        <div className="md:hidden fixed left-0 right-0 top-0 z-40 flex items-center justify-between border-b border-amber-100 bg-white/95 px-4 py-2 shadow-sm backdrop-blur">
          <span className="truncate text-xs text-gray-500">{member?.name ?? user.email}</span>
          <button
            onClick={signOut}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-500 hover:bg-amber-50 hover:text-amber-600"
          >
            <LogOut size={13} />
            로그아웃
          </button>
        </div>
      )}

      {/* 하단 탭바 (모바일) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-amber-100 z-50 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        <div className="flex min-h-20 items-start">
          {navItems.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex min-h-16 flex-col items-center justify-start gap-1 pt-3 text-xs font-medium transition-colors ${
                pathname === href ? 'text-amber-600' : 'text-gray-400'
              }`}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          ))}

          {/* 테마 버튼 (모바일) */}
          <div className="relative flex flex-1">
            <button
              onClick={() => setOpen((v) => !v)}
              className={`flex min-h-16 w-full flex-col items-center justify-start gap-1 self-stretch pt-3 text-xs font-medium transition-colors ${
                open ? 'text-amber-600' : 'text-gray-400'
              }`}
            >
              <Palette size={20} />
              <span>테마</span>
            </button>
            {open && (
              <div className="absolute bottom-20 right-0 bg-white border rounded-xl shadow-lg p-2 z-50 min-w-[130px]">
              {THEMES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => { setTheme(t.value); setOpen(false) }}
                    className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                      theme === t.value ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${t.color}`} />
                    {t.label}
                  </button>
                ))}
                {user && (
                  <button
                    onClick={() => { signOut(); setOpen(false) }}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-amber-100 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-amber-50"
                  >
                    <LogOut size={14} />
                    로그아웃
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}
