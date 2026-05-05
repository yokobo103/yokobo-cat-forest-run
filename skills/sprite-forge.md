# Skill: Sprite Forge

## Purpose

入力されたイメージ画像から、ゲーム用のキャラクター別スプライト素材を作る。
目的は「量産」ではなく、プレイアブル試作に使える最小素材を安定して作ること。

## Inputs

- 参考画像: `input/concept.png` またはユーザー指定画像
- 出力先: `assets/sprites/`
- 想定ゲーム: 2D横スクロール / ブラウザゲーム / Phaser.js想定
- 背景: 透明PNG
- 画風: 参考画像の雰囲気を維持。可能ならドット絵寄り、輪郭は明瞭。

## Default character set

参考画像から主要キャラクターを抽出して、最大3体まで作る。

優先順位:

1. 主人公
2. 敵キャラ
3. アイテムまたは小動物キャラ

キャラが曖昧な場合は、まず以下で作る。

- `hero_cat`
- `enemy_mouse`
- `item_fish`

## Required animations

### hero_cat

- idle: 4 frames
- run: 6 frames
- jump: 2 frames
- hurt: 2 frames

### enemy_mouse

- idle: 4 frames
- walk: 6 frames
- attack: 3 frames

### item_fish

- idle: 4 frames

## Output rules

各キャラごとに以下を作る。

```txt
assets/sprites/<character_id>/
├─ raw/
│  └─ generated_reference.png
├─ frames/
│  ├─ idle_000.png
│  ├─ idle_001.png
│  └─ ...
├─ sheets/
│  ├─ <character_id>_sheet.png
│  └─ <character_id>_sheet.json
├─ preview/
│  └─ <character_id>_preview.gif
└─ prompts/
   └─ <character_id>_prompts.md