// app/protected/page.jsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function ProtectedPage() {
  const token = cookies().get('auth_token')?.value
  if (!token) redirect('/login?from=/protected')

  return <div>Kun for loggede brugere</div>
}
