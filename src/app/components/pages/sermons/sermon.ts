import { Component, OnInit }                                from '@angular/core';
import { DomSanitizer, SafeResourceUrl, SafeStyle, Meta }   from '@angular/platform-browser';
import { ActivatedRoute }                                   from '@angular/router';
import { Autoclean }                                        from '../../templates/autoclean';

import {
  Analytics,
  FeatureToggles,
  Observable,
  SeriesImageService,
  Sermon,
  SermonService,
  VideoState,
  YoutubeService
} from '../../../services';

@Component({
  templateUrl: './sermon.html',
  styleUrls: [ './sermon.scss' ]
})
export class SermonComponent extends Autoclean implements OnInit {

  error: boolean = false;
  sermon: Sermon;
  live: boolean = false;
  youtube_url: SafeResourceUrl;
  icon: SafeStyle;

  videoState: VideoState = VideoState.UNSTARTED;
  analyticsInterval: number = 60000;

  constructor(
    private activatedRoute: ActivatedRoute,
    private analytics: Analytics,
    private imageService: SeriesImageService,
    private meta: Meta,
    private sanitizer: DomSanitizer,
    private service: SermonService,
    private youtubeService: YoutubeService
  ) {
    super();
  }

  ngOnInit() {
    /* Subscribe to Video State Change Events */
    this.autoclean(
      this.youtubeService
        .videoState('sermonVideo')
        .subscribe((state) => {
          this.videoState = state;
        }));

    /* Record Analytics when Playing */
    this.autoclean(
      Observable.interval(this.analyticsInterval)
        .subscribe(() => {
          if (this.videoState === VideoState.PLAYING) {
            this.analytics.event(this.live ? 'Live Sermon' : 'Sermon', 'Playing', this.sermon.youtube);
          }
        }));

    this.activatedRoute.params
      .flatMap((params) => {
        const id = params['sermon'];

        if (id === 'live') {
          this.live = true;
          return this.service.next();
        } else {
          this.live = false;
          return this.service.getSermon(id);
        }
      })
      .subscribe(sermon => {
        this.sermon = sermon;
        const url = `https://www.youtube.com/embed/${sermon.youtube}?enablejsapi=1`;
        this.youtube_url = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        this.error = false;

        if (sermon.image) {
          this.imageService.getSeriesImageStyle(sermon.image)
            .subscribe(style => { this.icon = style; });
        }
      }, (err) => {
        console.error(err);
        this.error = true;
        this.meta.addTag({
          name: 'prerender-status-code',
          content: '404'
        });
      });
  }
}
