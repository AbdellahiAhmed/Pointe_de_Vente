import { FunctionComponent, useEffect } from "react";
import ReactGA from '../../../ga';

export interface GoogleAnalyticsProps {
  page: string;
}

export const GoogleAnalytics: FunctionComponent<GoogleAnalyticsProps> = (props) => {
  useEffect(() => {
    try {
      ReactGA.send({
        hitType: 'pageview',
        page: props.page
      });
    } catch {
      /* GA tracking error — non-critical */
    }
  }, [props.page]);

  return null;
};
