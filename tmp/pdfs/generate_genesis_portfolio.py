from __future__ import annotations

from datetime import date
from pathlib import Path
from textwrap import shorten

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import (
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
ASSET_DIR = ROOT / "tmp" / "pdfs" / "genesis_assets"
NORMALIZED_DIR = ASSET_DIR / "normalized"
OUTPUT = ROOT / "output" / "pdf" / "portafolio_modelos_genesis_nicaragua.pdf"


MODELS = [
    {
        "name": "Moon",
        "category": "Scooter",
        "regular": "C$ 49,500",
        "promo": "C$ 39,188",
        "quota": "$ 56",
        "colors": "Azul, Gris, Rosado",
        "engine": "150 cc",
        "highlights": ["Scooter automatica", "USB, alarma y baul", "Tanque 6.6 L"],
        "image": "moon.jpg",
        "url": "https://genesisnic.com/tienda/moon/",
    },
    {
        "name": "KLIK",
        "category": "Scooter",
        "regular": "C$ 52,500",
        "promo": "C$ 43,583",
        "quota": "$ 63",
        "colors": "Rojo, Celeste, Rosado",
        "engine": "149.6 cc",
        "highlights": ["Mini-scooter urbana", "92 kg en seco", "Tanque 4.5 L"],
        "image": "klik.jpg",
        "url": "https://genesisnic.com/tienda/klik/",
    },
    {
        "name": "LUCKY",
        "category": "Underbone",
        "regular": "C$ 56,500",
        "promo": "C$ 48,345",
        "quota": "$ 68",
        "colors": "Azul, Blanco, Negro, Rojo",
        "engine": "110 cc",
        "highlights": ["Semi-automatica", "4 velocidades", "Tanque 4.7 L"],
        "image": "lucky.jpg",
        "url": "https://genesisnic.com/tienda/hj110-2/",
    },
    {
        "name": "RK125",
        "category": "Trabajo",
        "regular": "C$ 58,500",
        "promo": "C$ 47,612",
        "quota": "$ 69",
        "colors": "Negro, Rojo, Celeste",
        "engine": "125 cc",
        "highlights": ["5 velocidades", "Freno delantero de disco", "Tanque 12 L"],
        "image": "rk125.jpg",
        "url": "https://genesisnic.com/tienda/rk125/",
    },
    {
        "name": "DM125 Sport",
        "category": "Trabajo",
        "regular": "C$ 55,000",
        "promo": "C$ 43,950",
        "quota": "$ 64",
        "colors": "Azul, Rojo",
        "engine": "125 cc",
        "highlights": ["10 HP", "5 velocidades", "Tanque 10 L"],
        "image": "dm125.webp",
        "url": "https://genesisnic.com/tienda/dm125-sport/",
    },
    {
        "name": "GE150-6 2.0",
        "category": "Trabajo",
        "regular": "C$ 53,500",
        "promo": "C$ 44,315",
        "quota": "$ 59",
        "colors": "Azul, Negro, Rojo",
        "engine": "150 cc",
        "highlights": ["Modelo economico", "Respaldo para pasajero", "Velocidad max. >=90 km/h"],
        "image": "ge150.jpg",
        "url": "https://genesisnic.com/tienda/ge150-6/",
    },
    {
        "name": "RKS 180",
        "category": "Street",
        "regular": "C$ 75,160",
        "promo": "C$ 66,656",
        "quota": "$ 92",
        "colors": "Blanco, Negro, Verde",
        "engine": "180 cc",
        "highlights": ["11.2 kW", "5 velocidades", "Tanque 13 L"],
        "image": "rks180.webp",
        "url": "https://genesisnic.com/tienda/rks-180/",
    },
    {
        "name": "RKV 200",
        "category": "Street",
        "regular": "C$ 79,590",
        "promo": "C$ 69,590",
        "quota": "$ 95",
        "colors": "Negro, Rojo, Verde, Naranja",
        "engine": "200 cc",
        "highlights": ["Naked urbana", "5 velocidades", "Freno D/T de disco"],
        "image": "rkv200.webp",
        "url": "https://genesisnic.com/tienda/rkv-200/",
    },
    {
        "name": "Ka150",
        "category": "Street",
        "regular": "C$ 71,500",
        "promo": "C$ 65,557",
        "quota": "$ 87",
        "colors": "Blanco, Negro, Rojo",
        "engine": "149 cc",
        "highlights": ["5 velocidades", "Parrilla de carga", "Tanque 14 L"],
        "image": "ka150.jpg",
        "url": "https://genesisnic.com/tienda/ka150/",
    },
    {
        "name": "CR4-V",
        "category": "Street",
        "regular": "C$ 91,500",
        "promo": "C$ 80,600",
        "quota": "$ 112",
        "colors": "Negro, Rojo Carmesi",
        "engine": "249.4 cc",
        "highlights": ["24.1 HP", "6 velocidades", "Frenos de disco"],
        "image": "cr4v.jpg",
        "url": "https://genesisnic.com/tienda/cr4-v/",
    },
    {
        "name": "Sx1-150",
        "category": "Doble Proposito",
        "regular": "C$ 67,000",
        "promo": "C$ 56,768",
        "quota": "$ 78",
        "colors": "Negro, Rojo",
        "engine": "150 cc",
        "highlights": ["Todo terreno", "Monoshock trasero", "Tanque 14 L"],
        "image": "sx1.jpg",
        "url": "https://genesisnic.com/tienda/sx1-150/",
    },
    {
        "name": "Sx2 200 Cross",
        "category": "Doble Proposito",
        "regular": "C$ 81,312",
        "promo": "C$ 75,080",
        "quota": "$ 94",
        "colors": "Blanco, Rojo",
        "engine": "200 cc",
        "highlights": ["Todo terreno", "5 velocidades", "Tanque 14 L"],
        "image": "sx2.webp",
        "url": "https://genesisnic.com/tienda/sx2-200-cross/",
    },
    {
        "name": "SX3 250 4V",
        "category": "Doble Proposito",
        "regular": "C$ 95,000",
        "promo": "C$ 84,602",
        "quota": "$ 116",
        "colors": "Consultar disponibilidad",
        "engine": "250 cc",
        "highlights": ["4 valvulas", "6 velocidades", "Freno D/T de disco"],
        "image": "sx3.jpg",
        "url": "https://genesisnic.com/tienda/sx3-250-4v/",
    },
    {
        "name": "XWOLF 300",
        "category": "Cuadraciclos",
        "regular": "C$ 222,000",
        "promo": "C$ 186,784",
        "quota": "$ 198",
        "colors": "Negro, Verde",
        "engine": "271 cc",
        "highlights": ["ATV multiproposito", "Transmision CVT", "Tanque 14 L"],
        "image": "xwolf300.jpg",
        "url": "https://genesisnic.com/tienda/xwolf-300/",
    },
    {
        "name": "XWOLF 550L",
        "category": "Cuadraciclos",
        "regular": "C$ 328,000",
        "promo": "C$ 263,695",
        "quota": "$ 252",
        "colors": "Negro, Rojo",
        "engine": "499.5 cc",
        "highlights": ["2WD/4WD/4WD-Lock", "Transmision CVT+", "Tanque 25 L"],
        "image": "xwolf550.jpg",
        "url": "https://genesisnic.com/tienda/xwolf-550l/",
    },
]


PALETTE = {
    "ink": colors.HexColor("#151515"),
    "muted": colors.HexColor("#686868"),
    "line": colors.HexColor("#D9D9D9"),
    "soft": colors.HexColor("#F5F5F3"),
    "red": colors.HexColor("#B11226"),
    "dark_red": colors.HexColor("#7E0D1B"),
    "charcoal": colors.HexColor("#262626"),
    "green": colors.HexColor("#4A5D40"),
}


def normalize_images() -> None:
    NORMALIZED_DIR.mkdir(parents=True, exist_ok=True)
    for model in MODELS:
        src = ASSET_DIR / model["image"]
        out = NORMALIZED_DIR / f"{src.stem}.jpg"
        with PILImage.open(src) as raw:
            if raw.mode in ("RGBA", "LA") or "transparency" in raw.info:
                rgba = raw.convert("RGBA")
                base = PILImage.new("RGBA", rgba.size, (255, 255, 255, 255))
                base.alpha_composite(rgba)
                im = base.convert("RGB")
            else:
                im = raw.convert("RGB")
            # Trim excess white while preserving product shadows.
            bg = PILImage.new("RGB", im.size, (255, 255, 255))
            diff = PILImage.eval(PILImageChops.difference(im, bg), lambda px: 255 if px > 245 else 0)
            bbox = diff.getbbox()
            if bbox:
                left, top, right, bottom = bbox
                pad_x = int((right - left) * 0.04)
                pad_y = int((bottom - top) * 0.08)
                crop = (
                    max(0, left - pad_x),
                    max(0, top - pad_y),
                    min(im.size[0], right + pad_x),
                    min(im.size[1], bottom + pad_y),
                )
                im = im.crop(crop)
            im.thumbnail((900, 620), PILImage.Resampling.LANCZOS)
            canvas = PILImage.new("RGB", (900, 620), (255, 255, 255))
            canvas.paste(im, ((900 - im.width) // 2, (620 - im.height) // 2))
            canvas.save(out, "JPEG", quality=88, optimize=True)
        model["image_norm"] = str(out)


# Import after the function body so the main namespace above stays easy to scan.
from PIL import ImageChops as PILImageChops  # noqa: E402


def fmt_money_to_number(value: str) -> int:
    return int(value.replace("C$", "").replace(",", "").strip())


def p(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(text, style)


def make_styles():
    base = getSampleStyleSheet()
    styles = {
        "kicker": ParagraphStyle(
            "kicker",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=10,
            textColor=PALETTE["red"],
            alignment=TA_LEFT,
            spaceAfter=6,
        ),
        "title": ParagraphStyle(
            "title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=32,
            leading=36,
            textColor=PALETTE["ink"],
            alignment=TA_LEFT,
            spaceAfter=12,
        ),
        "subtitle": ParagraphStyle(
            "subtitle",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=11.5,
            leading=16,
            textColor=PALETTE["charcoal"],
            alignment=TA_LEFT,
            spaceAfter=10,
        ),
        "h1": ParagraphStyle(
            "h1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=PALETTE["ink"],
            spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "h2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            textColor=PALETTE["ink"],
            spaceBefore=4,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=PALETTE["charcoal"],
        ),
        "small": ParagraphStyle(
            "small",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7.6,
            leading=9.5,
            textColor=PALETTE["muted"],
        ),
        "small_right": ParagraphStyle(
            "small_right",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=9.5,
            textColor=PALETTE["muted"],
            alignment=TA_RIGHT,
        ),
        "metric": ParagraphStyle(
            "metric",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=15.5,
            leading=18,
            textColor=PALETTE["ink"],
            alignment=TA_CENTER,
        ),
        "metric_label": ParagraphStyle(
            "metric_label",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7.8,
            leading=9.5,
            textColor=PALETTE["muted"],
            alignment=TA_CENTER,
        ),
        "card_name": ParagraphStyle(
            "card_name",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=12.2,
            leading=14.5,
            textColor=PALETTE["ink"],
        ),
        "card_meta": ParagraphStyle(
            "card_meta",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7.8,
            leading=9.4,
            textColor=PALETTE["muted"],
        ),
        "card_price": ParagraphStyle(
            "card_price",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10.5,
            leading=12.5,
            textColor=PALETTE["red"],
        ),
        "table": ParagraphStyle(
            "table",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7.2,
            leading=8.6,
            textColor=PALETTE["charcoal"],
        ),
        "table_bold": ParagraphStyle(
            "table_bold",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.2,
            leading=8.6,
            textColor=PALETTE["ink"],
        ),
    }
    return styles


def header_footer(canvas, doc):
    canvas.saveState()
    width, height = letter
    canvas.setStrokeColor(PALETTE["line"])
    canvas.setLineWidth(0.4)
    canvas.line(doc.leftMargin, 0.48 * inch, width - doc.rightMargin, 0.48 * inch)
    canvas.setFont("Helvetica", 7.2)
    canvas.setFillColor(PALETTE["muted"])
    canvas.drawString(doc.leftMargin, 0.28 * inch, "Genesis Nicaragua | Portafolio de modelos")
    canvas.drawRightString(width - doc.rightMargin, 0.28 * inch, f"Pagina {doc.page}")
    canvas.restoreState()


def no_header_footer(canvas, doc):
    canvas.saveState()
    width, _ = letter
    canvas.setFont("Helvetica", 7.4)
    canvas.setFillColor(PALETTE["muted"])
    canvas.drawRightString(width - doc.rightMargin, 0.28 * inch, "Fuente: genesisnic.com")
    canvas.restoreState()


def metric_box(label: str, value: str, styles) -> Table:
    table = Table(
        [[p(value, styles["metric"])], [p(label, styles["metric_label"])]],
        colWidths=[1.45 * inch],
        rowHeights=[0.35 * inch, 0.26 * inch],
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.55, PALETTE["line"]),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table


def cover(styles):
    category_count = len({m["category"] for m in MODELS})
    min_price = min(fmt_money_to_number(m["promo"]) for m in MODELS)
    max_price = max(fmt_money_to_number(m["promo"]) for m in MODELS)
    data_date = date(2026, 5, 1).strftime("%d/%m/%Y")

    hero = NORMALIZED_DIR / "rkv200.jpg"
    img = Image(str(hero), width=6.35 * inch, height=2.2 * inch)
    img.hAlign = "CENTER"

    metrics = Table(
        [
            [
                metric_box("Modelos", str(len(MODELS)), styles),
                metric_box("Categorias", str(category_count), styles),
                metric_box("Promocional desde", f"C${min_price:,}", styles),
                metric_box("Hasta", f"C${max_price:,}", styles),
            ]
        ],
        colWidths=[1.55 * inch] * 4,
        hAlign="LEFT",
    )
    metrics.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 9)]))

    return [
        Spacer(1, 0.25 * inch),
        p("PORTAFOLIO DE MODELOS", styles["kicker"]),
        p("Genesis Nicaragua", styles["title"]),
        p(
            "Catalogo resumido de motocicletas y cuadraciclos disponibles en la vitrina oficial de Genesis Nicaragua, "
            f"con precios promocionales, cuotas referenciales, colores y rasgos tecnicos clave. Datos consultados el {data_date}.",
            styles["subtitle"],
        ),
        Spacer(1, 0.08 * inch),
        img,
        Spacer(1, 0.22 * inch),
        metrics,
        Spacer(1, 0.2 * inch),
        p(
            "Nota comercial: precios, colores, cuotas y promociones pueden cambiar. Las cuotas son referenciales y estan sujetas "
            "a condiciones de financiamiento, disponibilidad y validacion en tienda.",
            styles["small"],
        ),
        Spacer(1, 0.25 * inch),
        p("Fuente principal: https://genesisnic.com/", styles["small"]),
        PageBreak(),
    ]


def summary_table(styles):
    rows = [
        [
            p("Modelo", styles["table_bold"]),
            p("Categoria", styles["table_bold"]),
            p("Motor", styles["table_bold"]),
            p("Precio regular", styles["table_bold"]),
            p("Precio promo", styles["table_bold"]),
            p("Cuota", styles["table_bold"]),
            p("Colores", styles["table_bold"]),
        ]
    ]
    for m in MODELS:
        rows.append(
            [
                p(m["name"], styles["table_bold"]),
                p(m["category"], styles["table"]),
                p(m["engine"], styles["table"]),
                p(m["regular"], styles["table"]),
                p(m["promo"], styles["table_bold"]),
                p(m["quota"], styles["table"]),
                p(m["colors"], styles["table"]),
            ]
        )

    table = Table(
        rows,
        colWidths=[1.15 * inch, 1.0 * inch, 0.65 * inch, 0.88 * inch, 0.88 * inch, 0.48 * inch, 1.45 * inch],
        repeatRows=1,
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), PALETTE["charcoal"]),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.35, PALETTE["line"]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALETTE["soft"]]),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def category_overview(styles):
    categories = []
    order = ["Scooter", "Underbone", "Trabajo", "Street", "Doble Proposito", "Cuadraciclos"]
    for category in order:
        items = [m for m in MODELS if m["category"] == category]
        if not items:
            continue
        min_promo = min(fmt_money_to_number(m["promo"]) for m in items)
        names = ", ".join(m["name"] for m in items)
        categories.append(
            [
                p(category, styles["table_bold"]),
                p(str(len(items)), styles["table"]),
                p(f"Desde C$ {min_promo:,}", styles["table"]),
                p(shorten(names, width=72, placeholder="..."), styles["table"]),
            ]
        )
    table = Table(
        [[p("Categoria", styles["table_bold"]), p("Modelos", styles["table_bold"]), p("Rango", styles["table_bold"]), p("Incluye", styles["table_bold"])]]
        + categories,
        colWidths=[1.25 * inch, 0.7 * inch, 1.1 * inch, 3.65 * inch],
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), PALETTE["red"]),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.5, PALETTE["line"]),
                ("INNERGRID", (0, 0), (-1, -1), 0.3, PALETTE["line"]),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALETTE["soft"]]),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def model_card(model, styles) -> Table:
    img = Image(model["image_norm"], width=2.35 * inch, height=1.28 * inch)
    bullets = "<br/>".join(f"- {h}" for h in model["highlights"])
    text = [
        p(model["name"], styles["card_name"]),
        p(f"{model['category']} | {model['engine']}", styles["card_meta"]),
        Spacer(1, 0.05 * inch),
        p(f"Promo: {model['promo']}  |  Regular: {model['regular']}", styles["card_price"]),
        p(f"Cuota aprox.: {model['quota']}", styles["card_meta"]),
        Spacer(1, 0.04 * inch),
        p(bullets, styles["body"]),
        Spacer(1, 0.04 * inch),
        p(f"Colores: {model['colors']}", styles["small"]),
    ]
    inner = Table(
        [[img], [text]],
        colWidths=[2.75 * inch],
        rowHeights=[1.42 * inch, None],
    )
    inner.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.55, PALETTE["line"]),
                ("LINEABOVE", (0, 1), (0, 1), 0.35, PALETTE["line"]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (0, 0), (0, 0), "CENTER"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return inner


def category_section(category: str, models: list[dict], styles):
    story = [p(category, styles["h1"])]
    cards = [model_card(m, styles) for m in models]
    rows = []
    for i in range(0, len(cards), 2):
        row = [cards[i]]
        if i + 1 < len(cards):
            row.append(cards[i + 1])
        else:
            row.append("")
        rows.append(row)
    table = Table(rows, colWidths=[3.05 * inch, 3.05 * inch], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(table)
    return KeepTogether(story)


def sources_page(styles):
    links = [
        "https://genesisnic.com/",
        "https://genesisnic.com/tienda/moon/",
        "https://genesisnic.com/tienda/klik/",
        "https://genesisnic.com/tienda/hj110-2/",
        "https://genesisnic.com/tienda/rk125/",
        "https://genesisnic.com/tienda/dm125-sport/",
        "https://genesisnic.com/tienda/ge150-6/",
        "https://genesisnic.com/tienda/rks-180/",
        "https://genesisnic.com/tienda/rkv-200/",
        "https://genesisnic.com/tienda/ka150/",
        "https://genesisnic.com/tienda/cr4-v/",
        "https://genesisnic.com/tienda/sx1-150/",
        "https://genesisnic.com/tienda/sx2-200-cross/",
        "https://genesisnic.com/tienda/sx3-250-4v/",
        "https://genesisnic.com/tienda/xwolf-300/",
        "https://genesisnic.com/tienda/xwolf-550l/",
    ]
    rows = [[p("Fuente", styles["table_bold"])]]
    rows += [[p(link, styles["table"])] for link in links]
    table = Table(rows, colWidths=[6.45 * inch])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), PALETTE["charcoal"]),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.35, PALETTE["line"]),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return [
        PageBreak(),
        p("Fuentes y notas", styles["h1"]),
        p(
            "La informacion fue compilada desde la pagina principal y las paginas individuales de producto de Genesis Nicaragua. "
            "Se priorizaron datos utiles para comparacion comercial: categoria, precios, cuotas, colores y rasgos tecnicos.",
            styles["body"],
        ),
        Spacer(1, 0.12 * inch),
        table,
        Spacer(1, 0.12 * inch),
        p(
            "Aviso: las imagenes del documento son de uso referencial. El sitio de Genesis indica que las promociones aplican restricciones, "
            "las cuotas pueden variar y se debe consultar disponibilidad, colores y condiciones con vendedores en tienda.",
            styles["small"],
        ),
    ]


def build_pdf() -> None:
    normalize_images()
    styles = make_styles()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=letter,
        rightMargin=0.55 * inch,
        leftMargin=0.55 * inch,
        topMargin=0.58 * inch,
        bottomMargin=0.62 * inch,
        title="Portafolio de modelos Genesis Nicaragua",
        author="Codex",
    )

    story = []
    story.extend(cover(styles))
    story.append(p("Resumen del portafolio", styles["h1"]))
    story.append(p("Categorias, precios promocionales y cuotas referenciales extraidas de genesisnic.com.", styles["body"]))
    story.append(Spacer(1, 0.1 * inch))
    story.append(category_overview(styles))
    story.append(Spacer(1, 0.18 * inch))
    story.append(p("Tabla comparativa", styles["h2"]))
    story.append(summary_table(styles))
    story.append(PageBreak())

    order = ["Scooter", "Underbone", "Trabajo", "Street", "Doble Proposito", "Cuadraciclos"]
    first = True
    for category in order:
        models = [m for m in MODELS if m["category"] == category]
        if not models:
            continue
        if not first:
            story.append(Spacer(1, 0.06 * inch))
        story.append(category_section(category, models, styles))
        story.append(Spacer(1, 0.12 * inch))
        first = False

    story.extend(sources_page(styles))
    doc.build(story, onFirstPage=no_header_footer, onLaterPages=header_footer)


if __name__ == "__main__":
    build_pdf()
    print(OUTPUT)
