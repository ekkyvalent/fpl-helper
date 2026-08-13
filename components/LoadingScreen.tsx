'use client'

export default function LoadingScreen({ msg }: { msg: string }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4">
      <div className="w-9 h-9 border-[3px] border-gray-200 border-t-green-600 rounded-full animate-spin" />
      <p className="text-sm text-gray-500">{msg}</p>
    </div>
  )
}
