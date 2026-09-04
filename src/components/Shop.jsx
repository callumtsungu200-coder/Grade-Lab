import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  CURRENCY,
  SHOP,
  SHOP_CATEGORIES,
  computeGame,
  buyItem,
  setEquipped,
} from "../gamification.js"

function ItemPreview({ item }) {
  if (item.type === "avatar") return <span className="shop-preview-av">{item.value}</span>
  if (item.type === "title") return <span className="shop-preview-title">{item.value}</span>
  return <span className={"shop-preview-theme pbanner-" + item.value} />
}

export default function Shop({ onExit, onChange }) {
  const [cat, setCat] = useState("avatar")
  const [tick, setTick] = useState(0)
  const [flash, setFlash] = useState(null)

  const g = useMemo(() => computeGame(), [tick])
  const owned = new Set(g.game.owned)
  const equipped = g.game.equipped

  const items = SHOP.filter((i) => i.type === cat)

  const refresh = () => {
    setTick((t) => t + 1)
    if (onChange) onChange()
  }

  const doBuy = (item) => {
    const res = buyItem(item.id)
    if (res.ok) {
      setFlash({ msg: `Unlocked ${item.label}! It's now equipped.`, ok: true })
      refresh()
    } else if (res.reason === "poor") {
      setFlash({ msg: `Not enough ${CURRENCY.name} — keep studying to earn more.`, ok: false })
    }
    window.clearTimeout(doBuy._t)
    doBuy._t = window.setTimeout(() => setFlash(null), 2600)
  }

  const doEquip = (item, isEquipped) => {
    setEquipped(item.type, isEquipped ? null : item.id)
    refresh()
  }

  return (
    <div className="admin shop">
      <div className="admin-inner">
        <header className="admin-head">
          <div>
            <h1 className="admin-title">🛒 Item Shop</h1>
            <p className="admin-sub">Spend {CURRENCY.name} you earn from studying on avatars, titles and profile banners.</p>
          </div>
          <div className="shop-head-right">
            <span className="coin-pill big" title={`Your ${CURRENCY.name}`}>
              {CURRENCY.icon} {g.balance.toLocaleString()}
            </span>
            <button className="btn" onClick={onExit}>← Back</button>
          </div>
        </header>

        {flash && (
          <div className={"shop-flash " + (flash.ok ? "ok" : "bad")}>{flash.msg}</div>
        )}

        <div className="shop-cats" role="tablist">
          {SHOP_CATEGORIES.map((c) => (
            <button
              key={c.type}
              className={"shop-cat" + (cat === c.type ? " active" : "")}
              onClick={() => setCat(c.type)}
            >
              <span>{c.icon}</span> {c.label}
            </button>
          ))}
        </div>

        <div className="shop-grid">
          {items.map((item) => {
            const isOwned = owned.has(item.id)
            const isEquipped = equipped[item.type] === item.id
            const affordable = g.balance >= item.price
            return (
              <motion.div
                key={item.id}
                className={"shop-item" + (isEquipped ? " equipped" : "") + (isOwned ? " owned" : "")}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="shop-item-preview">
                  <ItemPreview item={item} />
                </div>
                <p className="shop-item-name">{item.label}</p>

                {isOwned ? (
                  <button
                    className={"shop-btn " + (isEquipped ? "is-equipped" : "equip")}
                    onClick={() => doEquip(item, isEquipped)}
                  >
                    {isEquipped ? "✓ Equipped" : "Equip"}
                  </button>
                ) : (
                  <button
                    className="shop-btn buy"
                    onClick={() => doBuy(item)}
                    disabled={!affordable}
                  >
                    {affordable ? (
                      <>{CURRENCY.icon} {item.price}</>
                    ) : (
                      <>Need {(item.price - g.balance).toLocaleString()} more</>
                    )}
                  </button>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
