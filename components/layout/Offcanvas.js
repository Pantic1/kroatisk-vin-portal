"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
const ThemeSwitch = dynamic(() => import("../elements/ThemeSwitch"), {
  ssr: false,
});
export default function Offcanvas({ isOffcanvas, handleOffcanvas }) {
  const [isTab, setIsTab] = useState(1);
  const handleTab = (i) => {
    setIsTab(i);
  };
  return (
    <>
      <div
        className={`offcanvas offcanvas-end ${isOffcanvas ? "show" : ""}`}
        tabIndex={-1}
        id="offcanvasRight"
        style={{ visibility: "visible" }}
        aria-modal="true"
        role="dialog"
      >
        <div className="offcanvas-header">
          <h6 id="offcanvasRightLabel">Setting</h6>
          <button
            type="button"
            className="btn-close text-reset"
            onClick={handleOffcanvas}
          />
        </div>
        <div className="offcanvas-body">
          <div className="widget-tabs">
            <ul className="widget-menu-tab style-1">
              <li
                className={`item-title ${isTab === 1 ? "active" : ""}`}
                onClick={() => handleTab(1)}
              >
                <span className="inner">
                  <div className="body-title">Theme Style</div>
                </span>
              </li>
              <li
                className={`item-title ${isTab === 2 ? "active" : ""}`}
                onClick={() => handleTab(2)}
              >
                <span className="inner">
                  <div className="body-title">Theme Colors</div>
                </span>
              </li>
            </ul>
            <div className="widget-content-tab">
              <div
                className={`widget-content-inner ${
                  isTab === 1 ? "active" : ""
                }`}
                style={{ display: `${isTab == 1 ? "block" : "none"}` }}
              >
                <form className="form-theme-style">
                  <fieldset className="theme-dark-light">
                    <div className="body-title mb-5">Theme color mode:</div>
                    <ThemeSwitch radioBtn />
                  </fieldset>
                  <fieldset className="layout-width">
                    <div className="body-title mb-5">Layout width style</div>
                    <div className="radio-buttons">
                      <div className="item">
                        <input
                          className="full"
                          type="radio"
                          name="width-style"
                          id="width-style1"
                          defaultChecked
                        />
                        <label htmlFor="width-style1" className>
                          <div className="body-title">Full width</div>
                        </label>
                      </div>
                      <div className="item">
                        <input
                          className="boxed"
                          type="radio"
                          name="width-style"
                          id="width-style2"
                        />
                        <label htmlFor="width-style2" className>
                          <div className="body-title">Boxed</div>
                        </label>
                      </div>
                    </div>
                  </fieldset>
                  <fieldset className="menu-style">
                    <div className="body-title mb-5">
                      Vertical &amp; Horizontal menu style
                    </div>
                    <div className="radio-buttons">
                      <div className="item">
                        <input
                          className="menu-click"
                          type="radio"
                          name="menu-style"
                          id="menu-style1"
                          defaultChecked
                        />
                        <label className htmlFor="menu-style1">
                          <div className="body-title">Menu click</div>
                        </label>
                      </div>
                      <div className="item">
                        <input
                          className="icon-hover"
                          type="radio"
                          name="menu-style"
                          id="menu-style2"
                        />
                        <label className htmlFor="menu-style2">
                          <div className="body-title">Icon hover</div>
                        </label>
                      </div>
                      <div className="item">
                        <input
                          className="icon-default"
                          type="radio"
                          name="menu-style"
                          id="menu-style3"
                        />
                        <label className htmlFor="menu-style3">
                          <div className="body-title">Icon default</div>
                        </label>
                      </div>
                    </div>
                  </fieldset>
                  <fieldset className="menu-position">
                    <div className="body-title mb-5">Menu position</div>
                    <div className="radio-buttons">
                      <div className="item">
                        <input
                          className="menu-fixed"
                          type="radio"
                          name="menu-position"
                          id="menu-position1"
                          defaultChecked
                        />
                        <label className htmlFor="menu-position1">
                          <div className="body-title">Fixed</div>
                        </label>
                      </div>
                      <div className="item">
                        <input
                          className="menu-scrollable"
                          type="radio"
                          name="menu-position"
                          id="menu-position2"
                        />
                        <label className htmlFor="menu-position2">
                          <div className="body-title">Scrollable</div>
                        </label>
                      </div>
                    </div>
                  </fieldset>
                  <fieldset className="header-position">
                    <div className="body-title mb-5">Header positions</div>
                    <div className="radio-buttons">
                      <div className="item">
                        <input
                          className="header-fixed"
                          type="radio"
                          name="header-positions"
                          id="header-positions1"
                          defaultChecked
                        />
                        <label className htmlFor="header-positions1">
                          <div className="body-title">Fixed</div>
                        </label>
                      </div>
                      <div className="item">
                        <input
                          className="header-scrollable"
                          type="radio"
                          name="header-positions"
                          id="header-positions2"
                        />
                        <label className htmlFor="header-positions2">
                          <div className="body-title">Scrollable</div>
                        </label>
                      </div>
                    </div>
                  </fieldset>
                  <fieldset className="style-loader">
                    <div className="body-title mb-5">Loader</div>
                    <div className="radio-buttons">
                      <div className="item">
                        <input
                          className="style-loader-on"
                          type="radio"
                          name="loader"
                          id="loader1"
                          defaultChecked
                        />
                        <label className htmlFor="loader1">
                          <div className="body-title">Enable</div>
                        </label>
                      </div>
                      <div className="item">
                        <input
                          className="style-loader-off"
                          type="radio"
                          name="loader"
                          id="loader2"
                        />
                        <label className htmlFor="loader2">
                          <div className="body-title">Disable</div>
                        </label>
                      </div>
                    </div>
                  </fieldset>
                  <div className="tf-button cursor-pointer w-full button-clear-select">
                    Clear all
                  </div>
                </form>
              </div>
              <div
                className={`widget-content-inner ${
                  isTab === 2 ? "active" : ""
                }`}
                style={{ display: `${isTab == 2 ? "block" : "none"}` }}
              >
                <form className="form-theme-color">
                  <fieldset className="menu-color">
                    <div className="body-title mb-10">
                      Menu Background color
                    </div>
                    <div className="select-colors-theme colors-menu mb-10">
                      <div className="item color-fff active default" />
                      <div className="item color-1E293B" />
                      <div className="item color-1B1B1C" />
                      <div className="item color-3A3043" />
                    </div>
                    <div className="text-tiny">
                      Note:If you want to change color Menu dynamically change
                      from below Theme Primary color picker
                    </div>
                  </fieldset>
                  <fieldset className>
                    <div className="body-title mb-10">
                      Header Background color
                    </div>
                    <div className="select-colors-theme colors-header mb-10">
                      <div className="item color-fff active default" />
                      <div className="item color-1E293B" />
                      <div className="item color-1B1B1C" />
                      <div className="item color-3A3043" />
                    </div>
                    <div className="text-tiny">
                      Note:If you want to change color Menu dynamically change
                      from below Theme Primary color picker
                    </div>
                  </fieldset>
                  <fieldset className>
                    <div className="body-title mb-10">Theme Primary color</div>
                    <div className="select-colors-theme colors-theme-primary mb-10">
                      <div className="item color-2377FC active default" />
                      <div className="item color-DE6E49" />
                      <div className="item color-35988D" />
                      <div className="item color-7047D6" />
                      <div className="item color-189D72" />
                      <div className="more-select">
                        <img src="/images/bg-menu/more.png" alt="" />
                      </div>
                    </div>
                  </fieldset>
                  <fieldset className>
                    <div className="body-title mb-10">
                      Theme Background color
                    </div>
                    <div className="select-colors-theme colors-theme-background mb-10">
                      <div className="item color-F2F7FB active default" />
                      <div className="item color-252E3A" />
                      <div className="item color-1E1D2A" />
                      <div className="item color-1B2627" />
                      <div className="item color-1F2027" />
                      <div className="more-select">
                        <img src="/images/bg-menu/more.png" alt="" />
                      </div>
                    </div>
                  </fieldset>
                  <fieldset className>
                    <div className="body-title mb-10">
                      Menu with background image
                    </div>
                    <div className="select-colors-theme image-menu-background mb-10">
                      <div className="item image img-1">
                        <img src="/images/bg-menu/img-1.jpg" alt="" />
                      </div>
                      <div className="item image img-2">
                        <img src="/images/bg-menu/img-2.jpg" alt="" />
                      </div>
                      <div className="item image img-3">
                        <img src="/images/bg-menu/img-3.jpg" alt="" />
                      </div>
                      <div className="item image img-4">
                        <img src="/images/bg-menu/img-4.jpg" alt="" />
                      </div>
                      <div className="item image img-5">
                        <img src="/images/bg-menu/img-5.jpg" alt="" />
                      </div>
                    </div>
                  </fieldset>
                  <div className="tf-button cursor-pointer w-full button-clear-select">
                    Clear all
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isOffcanvas && (
        <div className="modal-backdrop fade show" onClick={handleOffcanvas} />
      )}
    </>
  );
}
