"use client"

import { useState } from "react"
import Layout from "@/components/layout/Layout"
const API_BASE = process.env.NEXT_PUBLIC_API_URL

export default function TilføjNyBruger() {
    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const handleSubmit = async (e) => {
        e.preventDefault()

        const payload = { username, email, password, role: "admin" }

        const res = await fetch(API_BASE + "/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })

        if (!res.ok) {
            console.error("Signup fejl", await res.json())
            return
        }

        console.log("Signup succes:", await res.json())
    }
    return (
        <>
            <Layout breadcrumbTitleParent="Bruger" breadcrumbTitle="Tilføj ny bruger">
                <form onSubmit={handleSubmit} className="form-add-new-user form-style-2">
                    <div className="wg-box">
                        <div className="left">
                            <h5 className="mb-4">Konto</h5>
                            <div className="body-text">Udfyld informationen nedenfor for at tilføje en ny konto</div>
                        </div>
                        <div className="right flex-grow">
                            <fieldset className="name mb-24">
                                <div className="body-title mb-10">Navn</div>
                                <input className="flex-grow" type="text" placeholder="Brugernavn" value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    tabIndex={0} aria-required="true" />
                            </fieldset>
                            <fieldset className="email mb-24">
                                <div className="body-title mb-10">E-mail</div>
                                <input className="flex-grow" type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} tabIndex={0} aria-required="true" required />
                            </fieldset>
                            <fieldset className="password mb-24">
                                <div className="body-title mb-10">Adgangskode</div>
                                <input className="password-input" type="password" placeholder="Indtast adgangskode" value={password}
                                    onChange={(e) => setPassword(e.target.value)} tabIndex={0} aria-required="true" required />
                                <span className="show-pass">
                                    <i className="icon-eye view" />
                                    <i className="icon-eye-off hide" />
                                </span>
                            </fieldset>
                            <fieldset className="password">
                                <div className="body-title mb-10">Bekræft adgangskode</div>
                                <input className="password-input" type="password" placeholder="Bekræft adgangskode" value={password}
                                    onChange={(e) => setPassword(e.target.value)} tabIndex={0} aria-required="true" required />
                                <span className="show-pass">
                                    <i className="icon-eye view" />
                                    <i className="icon-eye-off hide" />
                                </span>
                            </fieldset>
                        </div>
                    </div>

                    <div className="bot">
                        <button className="tf-button w180" type="submit">Gem</button>
                    </div>
                </form>
            </Layout>
        </>
    )
}
