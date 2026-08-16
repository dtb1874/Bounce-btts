from pathlib import Path

css=Path('app/release.module.css')
c=css.read_text()
marker='/* v2.0 visible heritage imagery */'
if marker not in c:
    c += r'''

/* v2.0 visible heritage imagery */
.hero{
  min-height:172px!important;
  background:
    linear-gradient(90deg,rgba(12,8,12,.84) 0%,rgba(29,11,18,.62) 48%,rgba(52,17,28,.74) 100%),
    url('/assets/edinburgh-skyline.jpg') center 42%/cover no-repeat!important;
}
.hero::before{
  background:
    linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.28)),
    linear-gradient(90deg,rgba(116,32,52,.10),transparent 55%)!important
}
.hero::after{
  right:24px!important;top:12px!important;width:142px!important;height:142px!important;
  background:url('/assets/st-giles-heart.jpg') center/cover no-repeat!important;
  opacity:.42!important;border:2px solid rgba(232,190,95,.38)!important;
  box-shadow:0 12px 30px rgba(0,0,0,.38),inset 0 0 0 4px rgba(58,17,29,.42)!important;
}
.heading{
  min-height:96px;
  padding:15px 150px 13px 16px!important;
  overflow:hidden;
  border:1px solid rgba(232,190,95,.25)!important;
  border-left:3px solid rgba(232,190,95,.62)!important;
  border-radius:14px!important;
  background:
    linear-gradient(90deg,rgba(67,15,31,.94) 0%,rgba(29,13,20,.84) 62%,rgba(13,12,16,.48) 100%),
    url('/assets/edinburgh-skyline.jpg') right center/58% auto no-repeat!important;
  box-shadow:0 12px 28px rgba(0,0,0,.22)
}
.heading::after{
  right:20px!important;top:9px!important;width:82px!important;height:82px!important;
  opacity:.60!important;border:1px solid rgba(232,190,95,.5)!important;
  box-shadow:0 8px 20px rgba(0,0,0,.34)!important
}
.panel{
  background:
    linear-gradient(145deg,rgba(18,17,23,.965),rgba(12,13,17,.98)),
    url('/assets/st-giles-footer.jpg') center bottom/cover no-repeat!important
}
.panel::before{
  content:"";position:absolute;left:0;right:0;bottom:0;height:74px;pointer-events:none;
  background:linear-gradient(180deg,transparent,rgba(65,15,30,.26)),url('/assets/st-giles-footer.jpg') center 72%/cover no-repeat;
  opacity:.14;mix-blend-mode:screen
}
.leaguePage .enhancedTableShell::before,
.leaguePage .playerInsightPanel::before{
  opacity:.20;height:96px
}
.seasonTimeline{
  background:
    linear-gradient(145deg,rgba(66,12,29,.92),rgba(31,8,17,.94)),
    url('/assets/edinburgh-skyline.jpg') center top/cover no-repeat!important
}
.seasonTimeline::after{
  width:220px!important;height:220px!important;right:-38px!important;top:-50px!important;
  opacity:.20!important;border-radius:50%;filter:sepia(.15) saturate(.8)!important
}
.historyHero{
  background:
    linear-gradient(100deg,rgba(72,18,36,.88),rgba(20,12,17,.78)),
    url('/assets/edinburgh-skyline.jpg') center/cover no-repeat!important
}
.footer{
  background:
    linear-gradient(90deg,rgba(15,11,15,.94),rgba(49,16,29,.88)),
    url('/assets/st-giles-footer.jpg') center/cover no-repeat!important;
  border-top:1px solid rgba(232,190,95,.24)
}
@media(max-width:650px){
  .hero{min-height:150px!important;background-position:center 40%!important}
  .hero::after{right:9px!important;top:11px!important;width:92px!important;height:92px!important;opacity:.50!important}
  .hero h1{font-size:36px!important;max-width:66%}
  .hero h2{font-size:16px!important;max-width:68%}
  .hero p{max-width:68%;line-height:1.3}
  .heading{min-height:82px;padding:12px 88px 11px 12px!important;background-size:auto 100%!important;background-position:right center!important}
  .heading h2{font-size:25px!important;position:relative;z-index:2}
  .heading>div>span,.heading p{position:relative;z-index:2}
  .heading::after{right:9px!important;top:8px!important;width:65px!important;height:65px!important;opacity:.64!important}
  .panel::before{height:58px;opacity:.17}
  .seasonTimeline{background-position:center top!important}
  .seasonTimeline::after{width:150px!important;height:150px!important;opacity:.22!important}
}
'''
css.write_text(c)
