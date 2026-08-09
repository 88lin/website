/**
 * 页脚。整站唯一用墨色做底的地方——它是机架的底座，不是「深色模式」。
 */

import { footer } from '../content/site'

export function Foot() {
  return (
    <footer className="foot">
      <span>{footer.copyright}</span>
      <span className="foot__note">{footer.note}</span>
      <span className="num">
        数据核实 {footer.asOf} ·{' '}
        <a href={footer.source} target="_blank" rel="noreferrer noopener">
          源码
        </a>
      </span>
    </footer>
  )
}
