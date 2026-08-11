/**
 * #5A 代码面板 · macOS 窗口。
 *
 * 88lin 自己那套设计系统里的组件，用户点名要用。规格逐条照抄
 * components-preview.html：12px 圆角、隐藏溢出、40px 模糊投影；标题栏 #2D2D3A
 * 配 11px 三色圆点，中间是等宽小号文件名；面体 #1A1B26，内距 22px。
 * 语法色是 Tokyo Night —— 那是一套有名字的配色方案，换成品牌色这块面板就
 * 不再读作「代码」了，所以它是全站唯一允许写死色值的地方之一（见 index.css）。
 *
 * 它同时是整页唯一的深色实体。一整页奶油底需要一个锚点，否则版面没有重量。
 * 面积由 audit G23 卡住：深色像素不得超过全页的 12%。
 *
 * 内容用词法记号数组而不是字符串加正则：正则高亮在中文注释上会误伤，
 * 而且这几行是手写的真实配置，逐段标类型比写一个解析器便宜。
 */

import type { ReactNode } from 'react'

/** kw 关键字 / str 字符串 / fnc 函数与箭头 / num 数字 / cmt 注释 / 无 = 正文 */
export type TokKind = 'kw' | 'str' | 'fnc' | 'num' | 'cmt'

export type Tok = { t: string; c?: TokKind }

export function CodeMac({
  file,
  code,
  caption,
}: {
  file: string
  code: Tok[][]
  caption?: ReactNode
}) {
  return (
    <div className="code-mac">
      <div className="code-mac__tb">
        <div className="code-mac__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <span className="code-mac__fn">{file}</span>
      </div>
      <div className="code-mac__bd">
        <pre>
          <code>
            {code.map((line, i) => (
              <span key={i}>
                {line.map((tok, j) => (
                  <span className={tok.c} key={j}>
                    {tok.t}
                  </span>
                ))}
                {i < code.length - 1 ? '\n' : null}
              </span>
            ))}
          </code>
        </pre>
      </div>
      {caption}
    </div>
  )
}
