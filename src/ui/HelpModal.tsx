interface Props {
  onClose: () => void
}

export function HelpModal({ onClose }: Props) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>あそびかた</h2>
        <p className="help-goal">
          <strong>ゴール</strong>
          相手の<strong>おやつ</strong>を0にする。
        </p>
        <ol className="help-list">
          <li>
            <strong>召喚→犬→コマンド</strong> — 手札を場に出してから犬を選ぶ。
            犬ごとに違うコマンドが4つあり、それぞれ回数制限がある。
          </li>
          <li>
            <strong>チャレンジ／回復</strong> — 攻撃が中心。犬ごとにコマンド4つ（固有技あり）。
            守り無視・空きレーン専用・遠吠えよびなど個性がある。回復はだいたい1つ。
          </li>
          <li>
            <strong>空きレーン</strong> — おやつダメージは
            max(1, パワー−1)＋空きレーンボーナス（コマンド）±特技。
            パワー自体は基礎＋特技＋コマンドのパワーボーナス。
          </li>
          <li>
            <strong>属性</strong> — かけっこ→わんぱく→もふもふ→かしこい→かけっこ。
            有利でパワー+1、不利で-1。
          </li>
          <li>
            パワー＞守りで退場。届かなくても低確率で<strong>クリティカル</strong>突破（おやつダメ最低1）。
            動ける手がなければ自動ターン終了。
          </li>
        </ol>
        <p className="help-note">
          カードの色帯が属性。特技も忘れずに。
        </p>
        <button type="button" className="btn btn--primary" onClick={onClose}>
          とじる
        </button>
      </div>
    </div>
  )
}
