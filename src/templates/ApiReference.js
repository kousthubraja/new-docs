import React from "react";
import pathLib from "path";
import PropTypes from "prop-types";
import { graphql } from "gatsby";
import styled, { ThemeProvider } from "styled-components";
import { MDXRenderer } from "gatsby-plugin-mdx";
import { MDXProvider } from "@mdx-js/react";
import Helmet from "react-helmet";

import {
  NAV_THEMES,
  CSS_TRANSITION_SPEED,
  FONT_WEIGHT,
  PALETTE,
} from "constants/styles";
import components from "constants/docsComponentMapping";

import { sortReference, normalizeMdx } from "helpers/sortReference";
import { groupByCategory } from "helpers/documentation";

import { Column } from "basics/Grid";
import { LinkedH1, H5, HorizontalRule } from "basics/Text";
import { ArrowIcon, EditIcon } from "basics/Icons";
import { Link } from "basics/Links";

import { Footer } from "components/Documentation/Footer";
import { DocsBase } from "components/layout/DocsBase";
import { NavFrame, NavFooterLi } from "components/Navigation/SharedStyles";
import { NavLogo } from "components/Navigation/NavLogo";
import { SideNav, SideNavBody, TrackedContent } from "components/SideNav";
import {
  ScrollRouter,
  Context as ScrollRouterContext,
} from "components/ApiRefRouting/ScrollRouter";
import { Route, SectionPathContext } from "components/ApiRefRouting/Route";
import {
  ApiReferenceRow,
  ApiReferenceWrapper,
  Container,
  NestedRow,
  SideNavColumn,
  SideNavBackground,
} from "components/Documentation/SharedStyles";
import { Expansion } from "components/Expansion";

import { buildPathFromFile } from "../../buildHelpers/routes";

const NAV_BAR_HEIGHT = 89;
const FIXED_NAV_DISTANCE = 140 + NAV_BAR_HEIGHT;

const GreenTableCell = styled.td`
  color: ${PALETTE.lightGreen};
`;
const OrangeTableCell = styled.td`
  color: ${PALETTE.lightOrage};
`;
const TrackedEl = styled.div``;

const ExpansionContainerEl = styled.div`
  margin-top: 1rem;
`;
const NavTitleEl = styled(H5)`
  margin: 0;
  line-height: normal;
  font-weight: ${FONT_WEIGHT.bold};
  text-transform: uppercase;
`;
const NavItemEl = styled.div`
  display: block;
  text-align: left;
  white-space: nowrap;
  font-size: ${(props) => (props.depth > 0 ? "0.875rem" : "1rem")};
  color: ${(props) => (props.depth === 0 ? PALETTE.black80 : PALETTE.black60)};
  padding: 0.375rem 0;
  padding-left: ${(props) => (props.depth > 1 ? `${props.depth - 1}rem` : 0)};
  transition: opacity ${CSS_TRANSITION_SPEED.default} ease-out;
  font-weight: ${({ isActive }) =>
    isActive ? FONT_WEIGHT.bold : FONT_WEIGHT.normal};

  &:hover {
    color: ${PALETTE.lightGrey};
  }
`;
const DocNavEl = styled(NavFooterLi)`
  position: absolute;
  bottom: 0;
`;

const StyledLink = components.a;
// eslint-disable-next-line react/prop-types
const DocsLink = ({ href, ...props }) => {
  const originalPath = React.useContext(SectionPathContext);
  const { onLinkClick } = React.useContext(ScrollRouterContext);

  let url = href;

  // Resolve relative links
  if (url.startsWith(".")) {
    url = buildPathFromFile(
      pathLib.resolve(pathLib.dirname(originalPath), url),
    );
  }
  return (
    <StyledLink
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onLinkClick(url);
      }}
      href={url}
      {...props}
    />
  );
};
const NavLinkEl = styled(DocsLink)`
  color: inherit;
  font-weight: unset;
  display: block;
`;

const isInViewport = (elem) => {
  const bounding = elem.getBoundingClientRect();
  return (
    bounding.top >= 0 &&
    bounding.left >= 0 &&
    bounding.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    bounding.right <=
      (window.innerWidth || document.documentElement.clientWidth)
  );
};

// eslint-disable-next-line react/prop-types
const NavItem = ({ isActive, forwardedRef, children, depth }) => {
  const itemRef = React.useRef();
  const parentDom = forwardedRef;
  const { isScrollingDown } = React.useContext(ScrollRouterContext);

  React.useLayoutEffect(() => {
    if (isActive && parentDom) {
      const activeItemSize = itemRef.current.getBoundingClientRect();

      /* If the active navigation is not in view
      For cases when a user scrolled the nav to the point
      the active nav is out of viewport */
      if (!isInViewport(itemRef.current)) {
        itemRef.current.scrollIntoView();
      }

      /* If scroll direction is down and its active item's top value
       is bigger than FIXED_NAV_DISTANCE (229px), subtract that amount
       from scrollTop to keep the consistent top value
       Its top value gets inconsistent when it hits the separate dropdown category
      */
      if (isScrollingDown.current && activeItemSize.top > FIXED_NAV_DISTANCE) {
        if (activeItemSize.top > FIXED_NAV_DISTANCE) {
          /* Reset the distance between the active nav and its offset top */
          parentDom.current.scrollTop +=
            activeItemSize.top - FIXED_NAV_DISTANCE;
        } else {
          parentDom.current.scrollTop += activeItemSize.height;
        }
      } else if (
        !isScrollingDown.current &&
        activeItemSize.top < FIXED_NAV_DISTANCE
      ) {
        if (activeItemSize.top > FIXED_NAV_DISTANCE) {
          parentDom.current.scrollTop -=
            activeItemSize.top - FIXED_NAV_DISTANCE;
        } else {
          parentDom.current.scrollTop -= activeItemSize.height;
        }
      }
    }
  }, [isActive, parentDom, isScrollingDown]);

  return (
    <NavItemEl isActive={isActive} depth={depth} ref={itemRef}>
      {children}
    </NavItemEl>
  );
};

// This is a function, not a component
const renderItem = ({
  /* eslint-disable react/prop-types */
  depth,
  id,
  isActive,
  title,
  forwardedRef,
  isFirstItem,
  /* eslint-disable react/prop-types */
}) => {
  /* There are cases when folder's index.mdx shares the same title as
    its metadata.json's title. We are preventing redundancy by replacing
    its sub navigation's title to "Overview" if its title is the same
    as its metadata.json's */
  const navTitle = isFirstItem ? "Overview" : title;
  return (
    <NavItem depth={depth} forwardedRef={forwardedRef} isActive={isActive}>
      <NavLinkEl href={id}>{navTitle}</NavLinkEl>
    </NavItem>
  );
};

const componentMap = {
  ...components,
  a: DocsLink,
  wrapper: ApiReferenceWrapper,
  // eslint-disable-next-line react/prop-types
  td: ({ children }) => {
    if (children === "GET") {
      return <GreenTableCell>{children}</GreenTableCell>;
    }
    if (children === "POST") {
      return <OrangeTableCell>{children}</OrangeTableCell>;
    }
    return <td>{children}</td>;
  },
};

const ReferenceSection = React.memo(({ body, relativePath, title, link }) => {
  const path = buildPathFromFile(relativePath);

  return (
    <Route originalFilePath={relativePath} path={path}>
      <section>
        <TrackedContent>
          <TrackedEl id={path}>
            <LinkedH1 id={path}>{title}</LinkedH1>
            {link && (
              <Link href={link} newTab>
                <EditIcon color={PALETTE.purpleBlue} />
              </Link>
            )}
          </TrackedEl>
        </TrackedContent>

        <NestedRow>
          <MDXRenderer>{body}</MDXRenderer>
        </NestedRow>
        <HorizontalRule />
      </section>
    </Route>
  );
});

ReferenceSection.propTypes = {
  body: PropTypes.node.isRequired,
  relativePath: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  link: PropTypes.string,
};

const AbsoluteEl = styled.div`
  position: absolute;
  overflow-y: scroll;
  height: calc(100% - 48px);
  width: 100%;
  bottom: 3.25rem;
`;

// eslint-disable-next-line react/no-multi-comp
const ApiReference = React.memo(function ApiReference({ data, pageContext }) {
  const referenceDocs = sortReference(
    data.referenceDocs.edges.map(({ node }) => normalizeMdx(node)),
  );
  const sideNavRef = React.useRef();
  const docsBySubCategory = groupByCategory(referenceDocs);
  return (
    <ScrollRouter>
      <Helmet>
        {/* SEO optimization. For js-less visitors (i.e. some crawlers), redirect
        to the same URL but with only the relevant content. */}
        <noscript>
          {`<meta http-equiv="refresh" content="0;url=?javascript=false" />`}
        </noscript>
      </Helmet>
      <MDXProvider components={componentMap}>
        <DocsBase
          pageContext={pageContext}
          navigation={
            <ThemeProvider theme={NAV_THEMES.docs}>
              <NavFrame>
                <Container>
                  <ApiReferenceRow>
                    <Column xs={3} xl={4}>
                      <NavLogo pageName="Api Reference" />
                    </Column>
                  </ApiReferenceRow>
                </Container>
              </NavFrame>
            </ThemeProvider>
          }
        >
          <Container>
            <ApiReferenceRow>
              <SideNavColumn xs={3} lg={3} xl={4}>
                <SideNavBackground />
                <SideNav>
                  <AbsoluteEl ref={sideNavRef}>
                    {Object.entries(docsBySubCategory).map((nav, i) => (
                      <ExpansionContainerEl
                        // eslint-disable-next-line react/no-array-index-key
                        key={i}
                      >
                        <Expansion
                          title={<NavTitleEl>{nav[0]}</NavTitleEl>}
                          expandedModeTitle={<NavTitleEl>{nav[0]}</NavTitleEl>}
                          collapseIcon={<ArrowIcon direction="up" />}
                          expandIcon={<ArrowIcon direction="down" />}
                          isDefaultExpanded={true}
                        >
                          <SideNavBody
                            items={nav[1]}
                            renderItem={renderItem}
                            forwardedRef={sideNavRef}
                          />
                        </Expansion>
                      </ExpansionContainerEl>
                    ))}
                  </AbsoluteEl>
                  <DocNavEl>
                    <StyledLink href="/docs">Documentation</StyledLink>
                  </DocNavEl>
                </SideNav>
              </SideNavColumn>
              <Column xs={9} xl={18}>
                {referenceDocs.map(({ body, id, parent, title, link }) => (
                  <ReferenceSection
                    relativePath={parent.relativePath}
                    key={id}
                    title={title}
                    link={link}
                    body={body}
                  />
                ))}
                <Footer />
              </Column>
              <Column xs={4} xl={9} />
            </ApiReferenceRow>
          </Container>
        </DocsBase>
      </MDXProvider>
    </ScrollRouter>
  );
});

ApiReference.propTypes = {
  data: PropTypes.object.isRequired,
  pageContext: PropTypes.object.isRequired,
};

export default ApiReference;

export const pageQuery = graphql`
  query ApiReferenceQuery($ids: [String]) {
    referenceDocs: allMdx(filter: { id: { in: $ids } }) {
      edges {
        node {
          ...ApiReferencePage
        }
      }
    }
  }
`;