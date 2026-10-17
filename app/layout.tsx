import type {Metadata} from 'next';
export const metadata:Metadata={title:'ROADSTER · 飞跃挑战',description:'驾驶 3D Roadster 飞跃 U 形跳台，使用摇杆、冷气喷流挑战全球最远距离。'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body style={{margin:0,overflow:'hidden',background:'#0c1018'}}>{children}</body></html>;}